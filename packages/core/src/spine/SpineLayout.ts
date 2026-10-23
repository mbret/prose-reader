import {
  asapScheduler,
  BehaviorSubject,
  concatMap,
  defer,
  filter,
  map,
  merge,
  type Observable,
  observeOn,
  of,
  Subject,
  skip,
  startWith,
  switchMap,
  switchScan,
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

type SpineLayoutRequest = {
  options: SpineLayoutOptions
  /** Whether the viewport is measured first, as for a layout of the reader. */
  measuresViewport: boolean
  /** The first item the request can change. */
  firstAffectedItemIndex: number
}

type SpineItemEndOffset = { horizontalOffset: number; verticalOffset: number }

/**
 * An item as a pass laid it out: its place in the spine, and where the item
 * after it starts.
 */
type LaidOutSpineItem = {
  /**
   * @todo use absolute position for all direction.
   * translation of position should be done elsewhere
   */
  layout: SpineItemSpineLayout
  endOffset: SpineItemEndOffset
}

/** Where the first item starts, with no item ending before it. */
const spineStartOffset: SpineItemEndOffset = {
  horizontalOffset: 0,
  verticalOffset: 0,
}

/**
 * The layout as each request and each completed pass leave it. The items keep
 * the layouts the last completed pass gave them until the next one completes,
 * which replaces them all at once, so readers always see one coherent layout.
 *
 * A pending request also records the first item the next pass lays out from:
 * the first one any request since the last completed pass affects, since a
 * request cancels a pass still running for an older one, whose items are then
 * not laid out.
 */
type SpineLayoutState =
  | {
      stage: "requested"
      laidOutItems: readonly LaidOutSpineItem[]
      firstItemIndexAwaitingLayout: number
    }
  | { stage: "laidOut"; laidOutItems: readonly LaidOutSpineItem[] }

/**
 * A layout requested, with the first item its pass lays out from, then the
 * same layout done. The items before that one keep their layouts.
 */
export type SpineLayoutLifecycleEvent =
  | { stage: "requested"; firstItemIndexAwaitingLayout: number }
  | { stage: "laidOut" }

export class SpineLayout extends DestroyableClass {
  protected externalLayoutTrigger = new Subject<SpineLayoutOptions>()

  /** Before the first request, nothing is pending and no item laid out. */
  protected stateSubject = new BehaviorSubject<SpineLayoutState>({
    stage: "laidOut",
    laidOutItems: [],
  })

  /**
   * Each layout request as it is made, from `layout()` or from an item loading
   * or unloading, then its completion. A request is announced before anything
   * is done for it, measuring the viewport included, and a newer request
   * cancels whatever is still running for an older one, so a completion always
   * belongs to the latest request.
   */
  public readonly lifecycle$: Observable<SpineLayoutLifecycleEvent> =
    this.stateSubject.pipe(
      // the state as it is, before the next request or completion
      skip(1),
      map(
        (state): SpineLayoutLifecycleEvent =>
          state.stage === "requested"
            ? {
                stage: "requested",
                firstItemIndexAwaitingLayout:
                  state.firstItemIndexAwaitingLayout,
              }
            : { stage: "laidOut" },
      ),
    )

  /** Emits once a pass completes. */
  public readonly layout$: Observable<unknown> = this.lifecycle$.pipe(
    filter(({ stage }) => stage === "laidOut"),
  )

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
     *
     * Each request carries the first item it can change. An item's place only
     * depends on the items before it, whatever the reading direction, so a
     * layout started by an item's load ending lays out that item and the ones
     * after it, and leaves the ones before it as the last completed pass laid
     * them out: no hook, no renderer layout, no dirty flag. One of the reader
     * lays them all out.
     */
    const request$: Observable<SpineLayoutRequest> = merge(
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

    request$
      .pipe(
        /**
         * A request starts from the state the previous one left: the one a
         * completed pass gave or, when it cancels a pass still running, the
         * one of the request it replaces, which holds the first item that
         * pass had yet to lay out.
         */
        switchScan(
          (previousState, request) =>
            this.runLayoutPass(previousState, request),
          this.stateSubject.value,
        ),
        takeUntil(this.destroy$),
      )
      // Passes run whether or not anything listens.
      .subscribe(this.stateSubject)

    this.watchForVerticalWritingUpdate()
  }

  /**
   * The states a request takes the layout through: requested at once, then
   * laid out once its pass completes, unless a newer request cancels it first.
   */
  private runLayoutPass(
    previousState: SpineLayoutState,
    { options, measuresViewport, firstAffectedItemIndex }: SpineLayoutRequest,
  ): Observable<SpineLayoutState> {
    /**
     * A request whose pass this one cancels still counts: that pass may not
     * have laid out the items it affects.
     */
    const firstItemIndexAffectedSinceLastPass =
      previousState.stage === "requested"
        ? Math.min(
            previousState.firstItemIndexAwaitingLayout,
            firstAffectedItemIndex,
          )
        : firstAffectedItemIndex

    /**
     * The items before it keep their layouts, as far as a completed pass gave
     * them: before the first pass completes, there are none to keep.
     */
    const keptItems = previousState.laidOutItems.slice(
      0,
      firstItemIndexAffectedSinceLastPass,
    )
    const firstItemIndexAwaitingLayout = keptItems.length

    /**
     * The wait sits inside the switch rather than before it, so a request
     * cancels a pass already running for an older one instead of letting it
     * finish while the new request waits. Requests still coalesce, since each
     * one restarts the wait.
     *
     * Immediate only skips this artificial delay. Item layout itself can still
     * complete asynchronously depending on the renderer.
     */
    const wait$: Observable<unknown> = options.immediate
      ? of(undefined)
      : timer(50)

    const laidOut$ = defer(() => {
      if (measuresViewport) this.viewport.layout()

      this.spineItemsManager.items
        .slice(firstItemIndexAwaitingLayout)
        .forEach((item) => {
          item.markDirty()
        })

      return wait$
    }).pipe(
      switchMap(() => this.layOutItems(keptItems)),
      map(
        (laidOutItems): SpineLayoutState => ({
          stage: "laidOut",
          laidOutItems,
        }),
      ),
    )

    /**
     * The request is announced before anything is done for it: nothing above
     * runs until `laidOut$` is subscribed, and `startWith` delivers the
     * announcement to every listener first. Measuring the viewport notifies
     * synchronously, and whatever it notifies may navigate, so everything
     * tracking whether the layout is current must already know it is not.
     */
    return laidOut$.pipe(
      startWith<SpineLayoutState>({
        stage: "requested",
        laidOutItems: previousState.laidOutItems,
        firstItemIndexAwaitingLayout,
      }),
    )
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
   * Lays out the items after the ones kept, one after the other, each from
   * where the one before it ends, and gives every item of the spine once the
   * last is laid out. The items kept are the first ones, as the last completed
   * pass laid them out, which nothing requested since can have changed.
   */
  private layOutItems(
    keptItems: readonly LaidOutSpineItem[],
  ): Observable<readonly LaidOutSpineItem[]> {
    return this.spineItemsManager.items.slice(keptItems.length).reduce(
      (laidOutItems$, item) =>
        laidOutItems$.pipe(
          concatMap((laidOutItems) =>
            this.layOutItem(
              item,
              laidOutItems[laidOutItems.length - 1]?.endOffset ??
                spineStartOffset,
            ).pipe(
              map((laidOutItem) => {
                laidOutItems.push(laidOutItem)

                return laidOutItems
              }),
            ),
          ),
        ),
      /**
       * A list of the pass's own, so pushing to it is safe: nothing else sees
       * it before the pass completes, and a cancelled pass drops it. Copying
       * it for each item instead would cost the square of their number, which
       * a spine of a few thousand items feels.
       */
      defer(() => of([...keptItems])),
    )
  }

  /** Lays out one item from where the one before it ends. */
  private layOutItem(
    item: SpineItem,
    { horizontalOffset, verticalOffset }: SpineItemEndOffset,
  ): Observable<LaidOutSpineItem> {
    const isScreenStartItem =
      horizontalOffset % this.viewport.absoluteViewport.width === 0
    const isLastItem = item.index === this.spineItemsManager.items.length - 1
    const isVertical =
      this.settings.values.computedPageTurnDirection === `vertical`
    const isRTL = this.context.isRTL()

    const spreadPosition = this.getSpreadPosition(isScreenStartItem, isRTL)
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
        map(({ width, height }) => ({
          layout: this.createSpineItemLayout(
            isVertical,
            isRTL,
            edgeX,
            edgeY,
            width,
            height,
            this.viewport.absoluteViewport.width,
          ),
          endOffset: {
            horizontalOffset: edgeX + width,
            verticalOffset: isVertical ? edgeY + height : 0,
          },
        })),
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
      this.stateSubject.value.laidOutItems[itemIndex]?.layout ||
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
