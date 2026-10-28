import { filter, map, merge, scan, skip, takeUntil, tap } from "rxjs"
import { HTML_PREFIX } from "../constants"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import type { SpineItem } from "../spineItem/SpineItem"
import { isDefined } from "../utils/isDefined"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import type { Viewport } from "../viewport/Viewport"
import { createSpineLocator, type SpineLocator } from "./locator/SpineLocator"
import { Pages } from "./Pages"
import type { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout, type SpineLayoutOptions } from "./SpineLayout"

export type SpineState = {
  /**
   * The element holding the spine items, created once the reader is mounted,
   * and only then.
   */
  element: HTMLElement | undefined
  /**
   * The first item the pages may no longer describe as the latest layout
   * requested lays it out: the first one a layout requested since the pages
   * were last published can change. Every item after it can change too, and
   * none before it: an item's place depends only on the items before it.
   * `undefined` while the pages describe every item.
   *
   * A request moves it the moment it is announced, before anything is done
   * for it: back to the first item for `reader.layout()`, which can change
   * them all, and to the item itself when an item loads or unloads. A request
   * also cancels everything still running for older ones, the pass and the
   * page computation both, so the next pages published are the ones it asked
   * for, and they describe every item again, before anything else hears of
   * them.
   *
   * Item flags cannot tell this: a pass clears an item's dirty flag as soon as
   * it lays that item out, long before the pages are recomputed.
   *
   * The navigator derives from it whether the latest navigation holds on the
   * current layout.
   */
  firstItemIndexAwaitingLayout: number | undefined
}

export class Spine extends ReactiveEntity<SpineState> {
  protected spineLayout: SpineLayout

  public locator: SpineLocator
  public spineItemsObserver: SpineItemsObserver
  public pages: Pages

  constructor(
    protected context: Context,
    public spineItemsManager: SpineItemsManager,
    public spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
  ) {
    /**
     * Until the first pages are published there are none to describe a
     * layout, so every item awaits one.
     */
    super({ element: undefined, firstItemIndexAwaitingLayout: 0 })

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

    this.pages = new Pages(
      this.spineLayout,
      this.spineItemsManager,
      this.spineItemLocator,
      this.context,
      this.locator,
      this.viewport,
    )

    merge(
      this.spineLayout.lifecycle$,
      this.pages.state$.pipe(
        skip(1),
        map(() => ({ stage: "pagesPublished" as const })),
      ),
    )
      .pipe(
        scan((firstItemIndexAwaitingLayout, event) => {
          if (event.stage === "pagesPublished") return undefined

          // laid out, but the pages describing it are not published yet
          if (event.stage === "laidOut") return firstItemIndexAwaitingLayout

          /**
           * A pass that completed before this request keeps its items out of
           * the next pass, but until its pages are published they await
           * layout all the same.
           */
          return firstItemIndexAwaitingLayout === undefined
            ? event.firstItemIndexAwaitingLayout
            : Math.min(
                firstItemIndexAwaitingLayout,
                event.firstItemIndexAwaitingLayout,
              )
        }, this.value.firstItemIndexAwaitingLayout),
        takeUntil(this.destroy$),
      )
      .subscribe((firstItemIndexAwaitingLayout) => {
        this.mergeCompare({ firstItemIndexAwaitingLayout })
      })

    const spineElementUpdate$ = context.watch(`rootElement`).pipe(
      filter(isDefined),
      tap(() => {
        const element: HTMLElement = this.context.document.createElement(`div`)
        element.style.cssText = `
          height: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-spine`

        this.mergeCompare({ element })
      }),
    )

    const attachSpineItems$ = this.watch("element").pipe(
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

  /**
   * Whether the pages describe this item as the latest layout requested lays
   * it out: whether it comes before the state's
   * `firstItemIndexAwaitingLayout`. Its place, its pages and what a position
   * shows of it are then the ones the reader shows, even while a layout of
   * items after it is pending.
   *
   * The navigator reads it to decide whether an anchor is final.
   */
  public isLayoutCurrentFor(spineItem: SpineItem | number) {
    const spineItemIndex =
      typeof spineItem === "number" ? spineItem : spineItem.index
    const { firstItemIndexAwaitingLayout } = this.value

    return (
      firstItemIndexAwaitingLayout === undefined ||
      spineItemIndex < firstItemIndexAwaitingLayout
    )
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
    const { element } = this.value

    super.destroy()

    this.pages.destroy()
    this.spineLayout.destroy()
    this.spineItemsObserver.destroy()
    element?.remove()
  }
}
