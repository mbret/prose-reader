import {
  concat,
  EMPTY,
  filter,
  first,
  map,
  merge,
  mergeMap,
  type Observable,
  of,
  skip,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import { PAGE_VISIBILITY_THRESHOLD } from "../spine/Pages"
import type { Spine } from "../spine/Spine"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { withoutSettlement } from "./edges"
import type { Pagination } from "./Pagination"
import type {
  PaginationEdge,
  PaginationInfo,
  SettledPaginationEdge,
} from "./types"

type ResolvedEdges = {
  begin: SettledPaginationEdge<PaginationEdge>
  end: SettledPaginationEdge<PaginationEdge>
}

export class PaginationController extends DestroyableClass {
  constructor(
    protected context: Context,
    protected pagination: Pagination,
    protected spineItemsManager: SpineItemsManager,
    protected spine: Spine,
    protected isNavigationLocked$: Observable<boolean>,
    protected cfi: CfiManager,
  ) {
    super()

    /**
     * A navigation resolves a new result. That includes the navigator
     * restoring the current navigation onto every layout that lands, which it
     * does even when the position stays the same: until it has, the viewport
     * still shows the position as it was on the layout replaced, so the
     * restoration is what resolves a result over a new layout. A change of
     * layout currency, either way, only withdraws, and cancels whatever was
     * pending: it was resolved over the layout being replaced.
     *
     * Every trigger drops settlement first, so no entry point can forget to,
     * and cancels whatever the previous one left pending, so a superseded
     * result never reaches the reader. Since the layout cannot become stale
     * or current without cancelling a pending result, a result that finds it
     * current when it settles found it current throughout.
     */
    merge(
      this.context.bridgeEvent.navigation$.pipe(map(() => this.resolve$())),
      spine.isLayoutCurrent$.pipe(
        // Changes only: the current value is replayed on subscription.
        skip(1),
        map(() => EMPTY),
      ),
    )
      .pipe(
        switchMap((work$) =>
          concat(of(withoutSettlement(this.pagination.value)), work$),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => {
        this.pagination.update(result)
      })
  }

  /**
   * Resolves a result in two steps: cheap metrics once the navigator is free,
   * then positions once the viewport is free.
   */
  private resolve$(): Observable<PaginationInfo> {
    /**
     * @important
     *
     * Metrics are resolved immediately so user feedback (navigation buttons)
     * is not delayed. Nothing there is heavier than a layout lookup.
     *
     * We wait for the navigator to be unlocked first, which avoids resolving
     * while the user is panning for example. A locked navigator is an
     * unfinished navigation.
     */
    return this.isNavigationLocked$.pipe(
      filter((isLocked) => !isLocked),
      take(1),
      withLatestFrom(this.context.bridgeEvent.navigation$),
      mergeMap(([, navigation]) => {
        const metrics = this.resolveMetrics(navigation.position)

        /**
         * When the visible items cannot be resolved the previous metrics are
         * carried through and the positions pass still runs against them.
         * That path cannot settle: settlement claims the result describes the
         * pages now visible, and which those are is exactly what failed to
         * resolve.
         */
        const provisional = metrics ?? withoutSettlement(this.pagination.value)

        return concat(
          of(provisional),
          /**
           * Heavy operation: resolving a cfi can cost a lot, so it waits for a
           * free viewport.
           *
           * @todo add more optimization, comparing item before, after with
           * position, etc
           */
          this.context.bridgeEvent.viewportFree$.pipe(
            first(),
            switchMap(() =>
              this.resolvePositions({
                metrics: provisional,
                visibleRangeIsKnown: metrics !== undefined,
              }),
            ),
          ),
        )
      }),
    )
  }

  private getVisiblePages(
    spineItem: SpineItem,
    position: SpinePosition | UnboundSpinePosition,
  ) {
    return this.spine.locator.getVisiblePagesFromViewportPosition({
      spineItem,
      position,
      threshold: PAGE_VISIBILITY_THRESHOLD,
    })
  }

  /**
   * Cheap pass: which items and pages are visible. Positions are carried over
   * from the previous result, or fall back to the item start, and are only
   * resolved properly by {@link resolvePositions}.
   */
  private resolveMetrics(
    position: SpinePosition | UnboundSpinePosition,
  ): PaginationInfo | undefined {
    const previous = this.pagination.value

    const { beginIndex, endIndex } =
      this.spine.locator.getVisibleSpineItemsFromPosition({
        position,
        threshold: PAGE_VISIBILITY_THRESHOLD,
      }) ?? {}

    const beginSpineItem = this.spineItemsManager.get(beginIndex)
    const endSpineItem = this.spineItemsManager.get(endIndex)

    if (!beginSpineItem || !endSpineItem) return undefined

    const { beginPageIndex = 0 } =
      this.getVisiblePages(beginSpineItem, position) ?? {}
    const { endPageIndex = 0 } =
      this.getVisiblePages(endSpineItem, position) ?? {}

    return {
      isSettled: false,
      begin: this.resolveEdgeMetrics(
        beginSpineItem,
        beginIndex,
        beginPageIndex,
        previous.begin,
      ),
      end: this.resolveEdgeMetrics(
        endSpineItem,
        endIndex,
        endPageIndex,
        previous.end,
      ),
    }
  }

  /**
   * The previous cfi is kept while it still describes this edge: it exists, it
   * is not a root target, and the item has not changed. Otherwise the item
   * start stands in until {@link resolvePositions} resolves the real page.
   */
  private resolveEdgeMetrics(
    spineItem: SpineItem,
    spineItemIndex: number | undefined,
    pageIndexInSpineItem: number,
    previous: PaginationEdge,
  ): PaginationEdge {
    const canCarryOverCfi =
      previous.cfi !== undefined &&
      !this.cfi.isRootCfi(previous.cfi) &&
      previous.spineItemIndex === spineItemIndex

    return {
      cfi: canCarryOverCfi
        ? previous.cfi
        : this.cfi.generateRootCfi(spineItem.item),
      spineItemIndex,
      pageIndexInSpineItem,
      numberOfPagesInSpineItem: spineItem.numberOfPages,
    }
  }

  /**
   * Resolves the positions of the metrics it is given, rather than of whatever
   * the reader happens to hold by the time the viewport frees up. A newer
   * trigger cancels this one, so the result is for the latest request.
   *
   * It settles only if the visible range is known and, right now, the layout
   * is current and the visible items are ready. An item that is loaded and
   * laid out may legitimately resolve to its root cfi; an unloaded one is not
   * settled merely because a root cfi can be generated for it.
   */
  private resolvePositions({
    metrics,
    visibleRangeIsKnown,
  }: {
    metrics: PaginationInfo
    visibleRangeIsKnown: boolean
  }): Observable<PaginationInfo> {
    const begin = this.resolveEdgePositions(metrics.begin)
    const end = this.resolveEdgePositions(metrics.end)

    if (!begin || !end) return EMPTY

    const resolved: ResolvedEdges = { begin: begin.edge, end: end.edge }
    const items = [...new Set([begin.spineItem, end.spineItem])]

    const settles =
      visibleRangeIsKnown &&
      this.spine.isLayoutCurrent &&
      items.every((item) => item.value.isReady)

    if (!settles) return of({ isSettled: false, ...resolved })

    return this.settledUntilReadinessDrops(resolved, items)
  }

  /**
   * Settled until a visible item stops being ready, an unload for one. The
   * layout becoming stale is a trigger of its own, which cancels this result.
   */
  private settledUntilReadinessDrops(
    resolved: ResolvedEdges,
    items: SpineItem[],
  ): Observable<PaginationInfo> {
    const settled: PaginationInfo = { isSettled: true, ...resolved }

    return concat(
      of(settled),
      merge(
        ...items.map((item) =>
          item.isReady$.pipe(filter((isReady) => !isReady)),
        ),
      ).pipe(
        // An item destroyed with the reader completes without dropping.
        take(1),
        map(() => withoutSettlement(settled)),
      ),
    )
  }

  /** An edge's resolved position, and the item whose content it describes. */
  // @todo only update long cfi if the item layout change but specifically its content
  private resolveEdgePositions(edge: PaginationEdge):
    | {
        edge: SettledPaginationEdge<PaginationEdge>
        spineItem: SpineItem
      }
    | undefined {
    const { spineItemIndex, pageIndexInSpineItem } = edge

    if (spineItemIndex === undefined || pageIndexInSpineItem === undefined)
      return undefined

    const spineItem = this.spineItemsManager.get(spineItemIndex)

    if (!spineItem) return undefined

    const pageEntry = this.spine.pages.fromSpineItemPageIndex(
      spineItem,
      pageIndexInSpineItem,
    )
    const cfi = pageEntry
      ? this.cfi.generateCfiForPage(spineItem.item, pageEntry)
      : this.cfi.generateRootCfi(spineItem.item)

    return { edge: { ...edge, cfi }, spineItem }
  }
}
