import {
  concat,
  filter,
  first,
  map,
  merge,
  mergeMap,
  type Observable,
  of,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import type { Navigation } from "../navigation/types"
import type { PageEntry } from "../spine/Pages"
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

const VISIBILITY_THRESHOLD: { type: "percentage"; value: number } = {
  type: "percentage",
  value: 0.5,
}

type PaginationTrigger = "resolve" | "invalidate"

export class PaginationController extends DestroyableClass {
  constructor(
    protected context: Context,
    protected pagination: Pagination,
    protected spineItemsManager: SpineItemsManager,
    protected spine: Spine,
    protected isNavigationLocked$: Observable<boolean>,
    protected cfi: CfiManager,
    protected layoutRequest$: Observable<unknown>,
  ) {
    super()

    /**
     * A trigger always drops settlement first, so no entry point can forget
     * to, and a newer trigger cancels whatever is still pending, so a
     * superseded result can never reach the reader.
     */
    merge(
      this.context.bridgeEvent.navigation$.pipe(
        map((): PaginationTrigger => "resolve"),
      ),
      spine.layout$.pipe(map((): PaginationTrigger => "resolve")),
      /**
       * A layout that has only been requested invalidates and then waits. Item
       * layout is debounced, so resolving now would describe the spine that is
       * about to be replaced, and `spine.layout$` will resolve it once the new
       * one exists.
       */
      layoutRequest$.pipe(map((): PaginationTrigger => "invalidate")),
    )
      .pipe(
        switchMap((trigger) => {
          const invalidated = of(withoutSettlement(this.pagination.value))

          return trigger === "invalidate"
            ? invalidated
            : concat(invalidated, this.resolve$())
        }),
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
        const metrics = this.resolveMetrics(navigation)

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
            map(() =>
              this.resolvePositions({
                metrics: provisional,
                visibleRangeIsKnown: metrics !== undefined,
              }),
            ),
            filter((result): result is PaginationInfo => result !== undefined),
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
      threshold: VISIBILITY_THRESHOLD,
    })
  }

  /**
   * Cheap pass: which items and pages are visible. Positions are carried over
   * from the previous result, or fall back to the item start, and are only
   * resolved properly by {@link resolvePositions}.
   */
  private resolveMetrics(navigation: Navigation): PaginationInfo | undefined {
    const { position } = navigation
    const previous = this.pagination.value

    const { beginIndex, endIndex } =
      this.spine.locator.getVisibleSpineItemsFromPosition({
        position,
        threshold: VISIBILITY_THRESHOLD,
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
      navigationId: navigation.id,
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
   * the reader happens to hold by the time the viewport frees up.
   *
   * The result belongs to the current layout by construction, since a newer
   * trigger cancels this one, so settlement only has to ask whether the
   * visible content is ready. An item that is loaded and laid out may
   * legitimately resolve to its root cfi; an unloaded one is not settled
   * merely because a root cfi can be generated for it.
   */
  private resolvePositions({
    metrics,
    visibleRangeIsKnown,
  }: {
    metrics: PaginationInfo
    visibleRangeIsKnown: boolean
  }): PaginationInfo | undefined {
    const begin = this.resolveEdgePositions(metrics.begin)
    const end = this.resolveEdgePositions(metrics.end)

    if (!begin || !end) return undefined

    const { navigationId } = metrics

    return visibleRangeIsKnown && begin.isReady && end.isReady
      ? { isSettled: true, begin: begin.edge, end: end.edge, navigationId }
      : { isSettled: false, begin: begin.edge, end: end.edge, navigationId }
  }

  /**
   * An edge's resolved position, alongside whether the content it describes is
   * ready — settlement is the two edges' readiness together, so it cannot be
   * decided one edge at a time.
   */
  // @todo only update long cfi if the item layout change but specifically its content
  private resolveEdgePositions(edge: PaginationEdge):
    | {
        edge: SettledPaginationEdge<PaginationEdge>
        isReady: boolean
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

    return {
      edge: { ...edge, cfi: this.resolveCfi(spineItem, pageEntry) },
      isReady: spineItem.value.isReady,
    }
  }

  /**
   * The cfi of a page, falling back to the item itself when the page has no
   * resolvable first visible node.
   */
  private resolveCfi(spineItem: SpineItem, pageEntry: PageEntry | undefined) {
    return pageEntry?.firstVisibleNode
      ? this.cfi.generateCfiForSpineItemPage({
          spineItem: spineItem.item,
          pageNode: pageEntry.firstVisibleNode,
        })
      : this.cfi.generateRootCfi(spineItem.item)
  }
}
