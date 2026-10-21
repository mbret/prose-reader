import {
  asapScheduler,
  concatMap,
  defer,
  filter,
  map,
  merge,
  type Observable,
  observeOn,
  of,
  Subject,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { DocumentLoadStatus } from "../spineItem/renderer/DocumentRenderer"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import type { SpineItemsManager } from "./SpineItemsManager"
import type { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineItemSpineLayout } from "./types"

/**
 * Whether a change of an item's load status ends a load: its document
 * loaded, failed to load, or was released. Its content changed, and so can
 * its size and the positions after it.
 *
 * An unload of an item in error ends nothing: its failure released it
 * already, and nothing changes.
 */
const endsALoad = ({
  previousLoadStatus,
  loadStatus,
}: {
  previousLoadStatus: DocumentLoadStatus
  loadStatus: DocumentLoadStatus
}) => {
  const hasLoadFinished =
    previousLoadStatus === "loading" &&
    (loadStatus === "loaded" || loadStatus === "error")
  const hasDocumentBeenReleased =
    previousLoadStatus === "unloading" && loadStatus === "idle"

  return hasLoadFinished || hasDocumentBeenReleased
}

export type SpineLayoutOptions = {
  immediate?: boolean
}

/**
 * A layout requested, with the first spine item its pass lays out, then the
 * same layout done. An item's place only depends on the items before it,
 * whatever the reading direction, so a layout started by an item's load ending
 * lays out that item and the ones after it, and leaves the ones before it as
 * the last completed pass laid them out. One of the reader, whose viewport may
 * have changed, lays them all out. The items before the first are not touched
 * at all: no hook, no renderer layout, no dirty flag.
 */
export type SpineLayoutStage =
  | { stage: "requested"; firstAffectedItemIndex: number }
  | { stage: "laidOut" }

type SpineItemEndOffset = { horizontalOffset: number; verticalOffset: number }

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

  /** Where the item after each one starts, from the same pass. */
  protected spineItemsEndOffsets: SpineItemEndOffset[] = []

  /**
   * The first item a request since the last completed pass affects, which the
   * next pass has to lay out from: a request cancels a pass still running for
   * an older one, whose items are then not laid out yet. Recorded as each
   * request arrives and cleared when a pass publishes, the pass scheduler's own
   * bookkeeping.
   */
  protected firstItemIndexAwaitingLayout: number | undefined

  /**
   * Each layout request as it is made, from `layout()` or from an item loading
   * or unloading, then its completion. A request is announced before anything
   * is done for it, measuring the viewport included, and a newer request
   * cancels whatever is still running for an older one, so a completion always
   * belongs to the latest request.
   */
  public readonly lifecycle$: Observable<SpineLayoutStage>

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

    /**
     * A layout is also what restores the navigation and settles pagination,
     * on an item in error as on a loaded one.
     *
     * It is requested once the item's new status has reached all of its
     * subscribers: requesting it marks every item dirty, and done while the
     * status is still being delivered, that dirty state would reach the
     * item's later subscribers before the status itself, and they would end
     * on a state the item had left.
     */
    const spineItemNeedsLayout$ = spineItemsObserver.itemLoadStatusChange$.pipe(
      filter((loadStatusChange) => endsALoad(loadStatusChange)),
      observeOn(asapScheduler),
      map(({ item }) => ({
        options: { immediate: false } satisfies SpineLayoutOptions,
        firstAffectedItemIndex: item.index,
      })),
    )

    /**
     * A layout requested through `layout()` is a layout of the reader, whose
     * viewport may have changed; one started because an item's load ended is
     * not.
     */
    const request$ = merge(
      this.externalLayoutTrigger.pipe(
        map((options) => ({
          options,
          measuresViewport: true,
          firstAffectedItemIndex: 0,
        })),
      ),
      spineItemNeedsLayout$.pipe(
        map((request) => ({ ...request, measuresViewport: false })),
      ),
    )

    this.lifecycle$ = request$.pipe(
      map((request) => {
        this.firstItemIndexAwaitingLayout = Math.min(
          this.firstItemIndexAwaitingLayout ?? request.firstAffectedItemIndex,
          request.firstAffectedItemIndex,
          // an item no pass has laid out yet has no layout to keep
          this.spineItemsRelativeLayouts.length,
        )

        return {
          ...request,
          firstAffectedItemIndex: this.firstItemIndexAwaitingLayout,
        }
      }),
      switchMap(({ options, measuresViewport, firstAffectedItemIndex }) => {
        /**
         * The wait sits inside the switch rather than before it, so a request
         * cancels a pass already running for an older one instead of letting
         * it finish while the new request waits. Requests still coalesce,
         * since each one restarts the wait.
         *
         * Immediate only skips this artificial delay. Item layout itself can
         * still complete asynchronously depending on the renderer.
         */
        const wait$: Observable<unknown> = options.immediate
          ? of(undefined)
          : timer(50)

        const laidOut$ = defer(() => {
          if (measuresViewport) this.viewport.layout()

          this.spineItemsManager.items
            .slice(firstAffectedItemIndex)
            .forEach((item) => {
              item.markDirty()
            })

          return wait$
        }).pipe(
          switchMap(() => this.layOutItems(firstAffectedItemIndex)),
          map((): SpineLayoutStage => ({ stage: "laidOut" })),
        )

        /**
         * The request is announced before anything is done for it: nothing
         * above runs until `laidOut$` is subscribed, and `startWith` delivers
         * the announcement to every listener first. Measuring the viewport
         * notifies synchronously, and whatever it notifies may navigate, so
         * everything tracking whether the layout is current must already know
         * it is not.
         */
        return laidOut$.pipe(
          startWith<SpineLayoutStage>({
            stage: "requested",
            firstAffectedItemIndex,
          }),
        )
      }),
      takeUntil(this.destroy$),
      share(),
    )

    this.layout$ = this.lifecycle$.pipe(
      filter(({ stage }) => stage === "laidOut"),
    )

    // Passes run whether or not anything listens.
    this.lifecycle$.subscribe()

    this.watchForVerticalWritingUpdate()
  }

  private watchForVerticalWritingUpdate() {
    this.spineItemsObserver.itemLoadStatusChange$
      .pipe(
        filter(({ loadStatus }) => loadStatus === "loaded"),
        tap(({ item }) => {
          this.context.update({
            hasVerticalWriting: item.isUsingVerticalWriting(),
          })
        }),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  /**
   * Lays the items out in turn from `firstItemIndex`, each one starting where
   * the previous ended, then publishes the layouts of the whole spine at once.
   * The items before it keep the layouts the last completed pass gave them,
   * which nothing requested since can have changed.
   */
  private layOutItems(firstItemIndex: number) {
    /**
     * Local to this pass. A superseded pass is unsubscribed and its arrays
     * discarded, so a cancelled layout can never leave the published layouts
     * holding a mix of two passes.
     */
    const layouts = this.spineItemsRelativeLayouts.slice(0, firstItemIndex)
    const endOffsets = this.spineItemsEndOffsets.slice(0, firstItemIndex)
    const startOffset: SpineItemEndOffset = endOffsets[firstItemIndex - 1] ?? {
      horizontalOffset: 0,
      verticalOffset: 0,
    }

    return this.spineItemsManager.items
      .slice(firstItemIndex)
      .reduce(
        (acc$, item, offsetFromFirstItem) =>
          acc$.pipe(
            concatMap(({ horizontalOffset, verticalOffset }) => {
              const itemIndex = firstItemIndex + offsetFromFirstItem
              const isScreenStartItem =
                horizontalOffset % this.viewport.absoluteViewport.width === 0
              const isLastItem =
                itemIndex === this.spineItemsManager.items.length - 1
              const isVertical =
                this.settings.values.computedPageTurnDirection === `vertical`
              const isRTL = this.context.isRTL()

              const spreadPosition = this.getSpreadPosition(
                isScreenStartItem,
                isRTL,
              )
              const { edgeX, edgeY } = this.getStartEdges(
                isVertical,
                isScreenStartItem,
                horizontalOffset,
                verticalOffset,
                this.viewport.absoluteViewport.height,
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
                      this.viewport.absoluteViewport.width,
                    )

                    const endOffset: SpineItemEndOffset = {
                      horizontalOffset: edgeX + width,
                      verticalOffset: isVertical ? edgeY + height : 0,
                    }

                    layouts[itemIndex] = layoutPosition
                    endOffsets[itemIndex] = endOffset

                    return endOffset
                  }),
                )
            }),
          ),
        of(startOffset),
      )
      .pipe(
        // The pass completed: publish it in one assignment.
        tap(() => {
          this.spineItemsRelativeLayouts = layouts
          this.spineItemsEndOffsets = endOffsets
          this.firstItemIndexAwaitingLayout = undefined
        }),
      )
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
    if (!this.viewport.value.isSpread) return "none"

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
