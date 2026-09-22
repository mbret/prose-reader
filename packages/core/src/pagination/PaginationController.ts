import {
  concat,
  filter,
  first,
  map,
  merge,
  mergeMap,
  type Observable,
  of,
  scan,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
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

type PaginationTrigger = "navigation" | "layout" | "layoutRequest"

/**
 * A requested layout withholds settlement until a layout completes, whatever
 * triggers in between: a navigation in that window resolves against the spine
 * the layout is about to replace, and nothing it finds there describes the
 * current layout. Only a completed layout clears it.
 */
const isLayoutPending = (wasPending: boolean, trigger: PaginationTrigger) =>
  trigger === "layoutRequest" || (trigger === "navigation" && wasPending)

type TriggerState = { trigger: PaginationTrigger; layoutPending: boolean }

/** Nothing has been requested yet, so nothing is pending. */
const initialTriggerState: TriggerState = {
  trigger: "layout",
  layoutPending: false,
}

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
        map((): PaginationTrigger => "navigation"),
      ),
      spine.layout$.pipe(map((): PaginationTrigger => "layout")),
      /**
       * A layout that has only been requested invalidates and then waits. Item
       * layout is debounced, so resolving now would describe the spine that is
       * about to be replaced, and `spine.layout$` will resolve it once the new
       * one exists.
       */
      layoutRequest$.pipe(map((): PaginationTrigger => "layoutRequest")),
    )
      .pipe(
        scan(
          ({ layoutPending }, trigger): TriggerState => ({
            trigger,
            layoutPending: isLayoutPending(layoutPending, trigger),
          }),
          initialTriggerState,
        ),
        switchMap(({ trigger, layoutPending }) => {
          const invalidated = of(withoutSettlement(this.pagination.value))

          return trigger === "layoutRequest"
            ? invalidated
            : concat(invalidated, this.resolve$({ layoutPending }))
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
  private resolve$({
    layoutPending,
  }: {
    layoutPending: boolean
  }): Observable<PaginationInfo> {
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
            map(() =>
              this.resolvePositions({
                metrics: provisional,
                visibleRangeIsKnown: metrics !== undefined,
                layoutPending,
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
  private resolveMetrics(
    position: SpinePosition | UnboundSpinePosition,
  ): PaginationInfo | undefined {
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
   * A newer trigger cancels this one, so the result is for the latest request.
   * It describes the current layout only when no requested layout is pending,
   * and settlement then asks whether the visible content is ready. An item that
   * is loaded and laid out may legitimately resolve to its root cfi; an
   * unloaded one is not settled merely because a root cfi can be generated for
   * it.
   */
  private resolvePositions({
    metrics,
    visibleRangeIsKnown,
    layoutPending,
  }: {
    metrics: PaginationInfo
    visibleRangeIsKnown: boolean
    layoutPending: boolean
  }): PaginationInfo | undefined {
    const begin = this.resolveEdgePositions(metrics.begin)
    const end = this.resolveEdgePositions(metrics.end)

    if (!begin || !end) return undefined

    return visibleRangeIsKnown && !layoutPending && begin.isReady && end.isReady
      ? { isSettled: true, begin: begin.edge, end: end.edge }
      : { isSettled: false, begin: begin.edge, end: end.edge }
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
