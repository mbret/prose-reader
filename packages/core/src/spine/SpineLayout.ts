import {
  concatMap,
  debounceTime,
  map,
  merge,
  type Observable,
  of,
  Subject,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineItemSpineLayout } from "./types"

export type PageLayoutInformation = {
  absolutePageIndex: number
  itemIndex: number
  absolutePosition: SpineItemSpineLayout
}

export type LayoutInfo = {
  pages: PageLayoutInformation[]
}

export class SpineLayout extends DestroyableClass {
  protected externalLayoutTrigger = new Subject()

  /**
   * @todo use absolute position for all direction.
   * translation of position should be done elsewhere
   */
  protected spineItemsRelativeLayouts: SpineItemSpineLayout[] = []

  /**
   * Emit layout info after each layout is done.
   */
  public readonly layout$: Observable<unknown>

  constructor(
    protected spineItemsManager: SpineItemsManager,
    protected spineItemsObserver: SpineItemsObserver,
    protected context: Context,
    protected settings: ReaderSettingsManager,
    protected viewport: Viewport,
  ) {
    super()

    // upstream change, meaning we need to layout again to both resize correctly each item but also to
    // adjust positions, etc
    // This is dispatched AFTER the spine item state has been updated.
    const spineItemNeedsLayout$ = merge(
      spineItemsObserver.itemLoad$,
      spineItemsObserver.itemUnload$,
    )

    const layoutTrigger$ = merge(
      this.externalLayoutTrigger,
      spineItemNeedsLayout$,
    )

    this.layout$ = layoutTrigger$.pipe(
      tap(() => {
        this.spineItemsManager.items.forEach((item) => {
          item.markDirty()
        })
      }),
      debounceTime(50),
      switchMap(() =>
        this.spineItemsManager.items.reduce(
          (acc$, item, itemIndex) =>
            acc$.pipe(
              concatMap(({ horizontalOffset, verticalOffset }) => {
                const isScreenStartItem =
                  horizontalOffset % viewport.absoluteViewport.width === 0
                const isLastItem =
                  itemIndex === spineItemsManager.items.length - 1
                const isVertical =
                  settings.values.computedPageTurnDirection === `vertical`
                const isRTL = context.isRTL()

                const spreadPosition = this.getSpreadPosition(
                  isScreenStartItem,
                  isRTL,
                )
                const { edgeX, edgeY } = this.getStartEdges(
                  isVertical,
                  isScreenStartItem,
                  horizontalOffset,
                  verticalOffset,
                  viewport.absoluteViewport.height,
                )

                // we trigger an item layout which will update the visual and return
                // us with the item new eventual layout information.
                // This step is not yet about moving item or adjusting position.
                return item
                  .layout({
                    spreadPosition,
                    horizontalOffset,
                    isLastItem,
                    edgeX,
                    edgeY,
                  })
                  .pipe(
                    map(({ width, height }) => {
                      const layoutPosition = this.createSpineItemLayout(
                        isVertical,
                        isRTL,
                        edgeX,
                        edgeY,
                        width,
                        height,
                        viewport.absoluteViewport.width,
                      )

                      this.spineItemsRelativeLayouts[itemIndex] = layoutPosition

                      return {
                        horizontalOffset: edgeX + width,
                        verticalOffset: isVertical ? edgeY + height : 0,
                      }
                    }),
                  )
              }),
            ),
          of({ horizontalOffset: 0, verticalOffset: 0 }),
        ),
      ),
      takeUntil(this.destroy$),
      share(),
    )

    this.layout$.subscribe()

    this.watchForVerticalWritingUpdate()
  }

  private watchForVerticalWritingUpdate() {
    this.spineItemsObserver.itemLoad$
      .pipe(
        tap((spineItem) => {
          this.context.update({
            hasVerticalWriting: spineItem.isUsingVerticalWriting(),
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  layout() {
    this.externalLayoutTrigger.next(undefined)
  }

  public getSpineItemSpineLayoutInfo(
    spineItemOrIndex: SpineItem | number | string | undefined,
  ) {
    const itemIndex =
      this.spineItemsManager.getSpineItemIndex(spineItemOrIndex) ?? 0

    return (
      this.spineItemsRelativeLayouts[itemIndex] ||
      new SpineItemSpineLayout({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
      })
    )
  }

  get numberOfPages() {
    return this.spineItemsManager.items.reduce((acc, item) => {
      return acc + item.numberOfPages
    }, 0)
  }

  public destroy() {
    super.destroy()

    this.externalLayoutTrigger.complete()
  }

  private getSpreadPosition(
    isScreenStartItem: boolean,
    isRTL: boolean,
  ): "left" | "right" | "none" {
    if (!this.settings.values.computedSpreadMode) return "none"

    if (isScreenStartItem) {
      return isRTL ? "right" : "left"
    }

    return isRTL ? "left" : "right"
  }

  private getStartEdges(
    isVertical: boolean,
    isScreenStartItem: boolean,
    horizontalOffset: number,
    verticalOffset: number,
    viewportHeight: number,
  ) {
    if (isVertical) {
      return {
        edgeX: isScreenStartItem ? 0 : horizontalOffset,
        edgeY: isScreenStartItem
          ? verticalOffset
          : verticalOffset - viewportHeight,
      }
    }

    return {
      edgeX: horizontalOffset,
      edgeY: 0,
    }
  }

  private createSpineItemLayout(
    isVertical: boolean,
    isRTL: boolean,
    edgeX: number,
    edgeY: number,
    width: number,
    height: number,
    viewportWidth: number,
  ) {
    if (isVertical) {
      const newEdgeX = width + edgeX
      const newEdgeY = height + edgeY

      return new SpineItemSpineLayout({
        left: edgeX,
        right: newEdgeX,
        top: edgeY,
        bottom: newEdgeY,
        height,
        width,
        x: edgeX,
        y: edgeY,
      })
    }

    const left = isRTL ? viewportWidth - edgeX - width : edgeX

    return new SpineItemSpineLayout({
      right: isRTL ? viewportWidth - edgeX : edgeX + width,
      left,
      x: left,
      top: edgeY,
      bottom: height,
      height,
      width,
      y: edgeY,
    })
  }
}
