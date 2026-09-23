import {
  concat,
  concatMap,
  defer,
  filter,
  map,
  merge,
  type Observable,
  of,
  Subject,
  share,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineItemSpineLayout } from "./types"

export type SpineLayoutOptions = {
  immediate?: boolean
}

export class SpineLayout extends DestroyableClass {
  protected externalLayoutTrigger = new Subject<SpineLayoutOptions>()

  /**
   * Layouts of the last completed pass. Replaced as a whole, never written
   * item by item, so readers always see one coherent layout.
   *
   * @todo use absolute position for all direction.
   * translation of position should be done elsewhere
   */
  protected spineItemsRelativeLayouts: SpineItemSpineLayout[] = []

  /**
   * Each layout request as it is made, from `layout()` or from an item loading
   * or unloading, then its completion. A request is announced before anything
   * is done for it, measuring the viewport included, and a newer request
   * cancels whatever is still running for an older one, so a completion always
   * belongs to the latest request.
   */
  public readonly lifecycle$: Observable<"requested" | "laidOut">

  /** Emits once a pass completes. */
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
    ).pipe(
      map(
        (): SpineLayoutOptions => ({
          immediate: false,
        }),
      ),
    )

    /**
     * A layout requested through `layout()` is a layout of the reader, whose
     * viewport may have changed; one started because an item loaded or
     * unloaded is not.
     */
    const request$ = merge(
      this.externalLayoutTrigger.pipe(
        map((options) => ({ options, measuresViewport: true })),
      ),
      spineItemNeedsLayout$.pipe(
        map((options) => ({ options, measuresViewport: false })),
      ),
    )

    this.lifecycle$ = request$.pipe(
      /**
       * The wait sits inside the switch rather than before it, so a request
       * cancels a pass already running for an older one instead of letting it
       * finish while the new request waits. Requests still coalesce, since
       * each one restarts the wait.
       *
       * Immediate only skips this artificial delay. Item layout itself can
       * still complete asynchronously depending on the renderer.
       */
      switchMap(({ options, measuresViewport }) => {
        const wait$: Observable<unknown> = options.immediate
          ? of(undefined)
          : timer(50)

        /**
         * The request is announced before anything is done for it. Measuring
         * the viewport notifies synchronously, and whatever it notifies may
         * navigate, so everything tracking whether the layout is current must
         * already know it is not.
         */
        return concat(
          of("requested" as const),
          defer(() => {
            if (measuresViewport) this.viewport.layout()

            this.spineItemsManager.items.forEach((item) => {
              item.markDirty()
            })

            return wait$
          }).pipe(
            switchMap(() => {
              /**
               * Local to this pass. A superseded pass is unsubscribed and its array
               * discarded, so a cancelled layout can never leave the published
               * layouts holding a mix of two passes.
               */
              const layouts: SpineItemSpineLayout[] = []

              return this.spineItemsManager.items
                .reduce(
                  (acc$, item, itemIndex) =>
                    acc$.pipe(
                      concatMap(({ horizontalOffset, verticalOffset }) => {
                        const isScreenStartItem =
                          horizontalOffset % viewport.absoluteViewport.width ===
                          0
                        const isLastItem =
                          itemIndex === spineItemsManager.items.length - 1
                        const isVertical =
                          settings.values.computedPageTurnDirection ===
                          `vertical`
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

                              layouts[itemIndex] = layoutPosition

                              return {
                                horizontalOffset: edgeX + width,
                                verticalOffset: isVertical ? edgeY + height : 0,
                              }
                            }),
                          )
                      }),
                    ),
                  of({ horizontalOffset: 0, verticalOffset: 0 }),
                )
                .pipe(
                  // The pass completed: publish it in one assignment.
                  tap(() => {
                    this.spineItemsRelativeLayouts = layouts
                  }),
                )
            }),
            map(() => "laidOut" as const),
          ),
        )
      }),
      takeUntil(this.destroy$),
      share(),
    )

    this.layout$ = this.lifecycle$.pipe(filter((stage) => stage === "laidOut"))

    // Passes run whether or not anything listens.
    this.lifecycle$.subscribe()

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

  /** Requests a layout of the reader: the viewport is measured, then the spine laid out. */
  layout(options: SpineLayoutOptions = {}) {
    this.externalLayoutTrigger.next(options)
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
