import { BehaviorSubject, merge } from "rxjs"
import {
  distinctUntilChanged,
  filter,
  map,
  skip,
  takeUntil,
  tap,
} from "rxjs/operators"
import { HTML_PREFIX } from "../constants"
import type { Context } from "../context/Context"
import type { Pagination } from "../pagination/Pagination"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { isDefined } from "../utils/isDefined"
import type { Viewport } from "../viewport/Viewport"
import { SpineItemsLoader } from "./loader/SpineItemsLoader"
import { createSpineLocator, type SpineLocator } from "./locator/SpineLocator"
import { Pages } from "./Pages"
import type { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout, type SpineLayoutOptions } from "./SpineLayout"

export class Spine extends DestroyableClass {
  protected elementSubject = new BehaviorSubject<HTMLElement | undefined>(
    undefined,
  )
  protected spineLayout: SpineLayout

  public readonly spineItemsLoader: SpineItemsLoader
  public locator: SpineLocator
  public spineItemsObserver: SpineItemsObserver
  public pages: Pages
  public element$ = this.elementSubject.asObservable()

  protected isLayoutCurrentSubject = new BehaviorSubject(true)

  /**
   * Whether the pages describe the latest layout requested. A request makes
   * them stale the moment it is announced, before anything is done for it,
   * whether it came through `reader.layout()` or from an item loading or
   * unloading. A request also cancels everything still running for older
   * ones, the pass and the page computation both, so the next pages published
   * are the ones it asked for, and they make the layout current again, before
   * anything else hears of them.
   *
   * Item flags cannot tell this: a pass clears an item's dirty flag as soon as
   * it lays that item out, long before the pages are recomputed.
   */
  public readonly isLayoutCurrent$ = this.isLayoutCurrentSubject.pipe(
    distinctUntilChanged(),
  )

  constructor(
    protected context: Context,
    protected pagination: Pagination,
    public spineItemsManager: SpineItemsManager,
    public spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
  ) {
    super()

    this.spineItemsObserver = new SpineItemsObserver(spineItemsManager)

    this.spineLayout = new SpineLayout(
      spineItemsManager,
      this.spineItemsObserver,
      context,
      settings,
      viewport,
    )

    this.locator = createSpineLocator({
      context,
      spineItemsManager,
      spineItemLocator,
      settings,
      spineLayout: this.spineLayout,
      viewport,
    })

    this.spineItemsLoader = new SpineItemsLoader(
      this.context,
      spineItemsManager,
      this.locator,
      settings,
      this.spineLayout,
      this.viewport,
    )

    this.pages = new Pages(
      this.spineLayout,
      this.spineItemsManager,
      this.spineItemLocator,
      this.context,
      this.locator,
      this.viewport,
    )

    merge(
      this.spineLayout.lifecycle$.pipe(
        filter((stage) => stage === "requested"),
        map(() => false),
      ),
      this.pages.state$.pipe(
        skip(1),
        map(() => true),
      ),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe(this.isLayoutCurrentSubject)

    const spineElementUpdate$ = context.watch(`rootElement`).pipe(
      filter(isDefined),
      tap(() => {
        const element: HTMLElement = this.context.document.createElement(`div`)
        element.style.cssText = `
          height: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-spine`

        this.elementSubject.next(element)
      }),
    )

    const attachSpineItems$ = this.element$.pipe(
      filter(isDefined),
      tap((element) => {
        this.spineItemsManager.items.forEach((item) => {
          item.attach(element)
        })
      }),
    )

    merge(attachSpineItems$, spineElementUpdate$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  public get element() {
    return this.elementSubject.getValue()
  }

  /** {@link isLayoutCurrent$} now. */
  public get isLayoutCurrent() {
    return this.isLayoutCurrentSubject.getValue()
  }

  public layout(options?: SpineLayoutOptions) {
    this.spineLayout.layout(options)
  }

  public getSpineItemSpineLayoutInfo(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    return this.spineLayout.getSpineItemSpineLayoutInfo(spineItemOrIndex)
  }

  public get layout$() {
    // first spineLayout then pages
    return this.pages.layout$
  }

  /**
   * Every pass that laid the items out: their sizes and places in the spine
   * are known, their pages are not yet.
   */
  public get itemsLayout$() {
    return this.spineLayout.layout$
  }

  public destroy() {
    super.destroy()

    this.pages.destroy()
    this.spineItemsLoader.destroy()
    this.elementSubject.getValue()?.remove()
    this.elementSubject.complete()
  }
}
