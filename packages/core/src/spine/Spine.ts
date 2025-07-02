import { isDefined } from "reactjrx"
import { BehaviorSubject, combineLatest, merge, type Observable } from "rxjs"
import { filter, takeUntil, tap } from "rxjs/operators"
import { HTML_PREFIX } from "../constants"
import type { Context } from "../context/Context"
import type { HookManager } from "../hooks/HookManager"
import type { Pagination } from "../pagination/Pagination"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import { SpineItemsLoader } from "./loader/SpineItemsLoader"
import { createSpineLocator, type SpineLocator } from "./locator/SpineLocator"
import { Pages } from "./Pages"
import type { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout } from "./SpineLayout"

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

  constructor(
    protected parentElement$: Observable<HTMLElement | undefined>,
    protected context: Context,
    protected pagination: Pagination,
    public spineItemsManager: SpineItemsManager,
    public spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected viewport: Viewport,
  ) {
    super()

    this.spineLayout = new SpineLayout(
      spineItemsManager,
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
    )

    this.spineItemsObserver = new SpineItemsObserver(
      spineItemsManager,
      this.locator,
    )

    this.pages = new Pages(
      this.spineLayout,
      this.spineItemsManager,
      this.spineItemLocator,
      this.context,
      this.locator,
      this.viewport,
    )

    const spineElementUpdate$ = parentElement$.pipe(
      filter(isDefined),
      tap((parentElement) => {
        const element: HTMLElement =
          parentElement.ownerDocument.createElement(`div`)
        element.style.cssText = `
          height: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-spine`

        this.elementSubject.next(element)
      }),
    )

    const loadSpineItems$ = combineLatest([
      this.context.manifest$,
      this.element$,
    ]).pipe(
      tap(([manifest, element]) => {
        if (!element) return

        this.spineItemsManager.destroyItems()

        const spineItems = manifest.spineItems.map(
          (resource, index) =>
            new SpineItem(
              resource,
              element,
              this.context,
              this.settings,
              this.hookManager,
              index,
            ),
        )

        this.spineItemsManager.addMany(spineItems)
      }),
    )

    merge(loadSpineItems$, spineElementUpdate$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  public get element() {
    return this.elementSubject.getValue()
  }

  public layout() {
    this.spineLayout.layout()
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

  public destroy() {
    super.destroy()

    this.pages.destroy()
    this.spineItemsLoader.destroy()
    this.elementSubject.getValue()?.remove()
    this.elementSubject.complete()
  }
}
