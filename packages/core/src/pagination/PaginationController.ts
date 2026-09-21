import {
  filter,
  map,
  merge,
  type Observable,
  share,
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
import { waitForSwitch } from "../utils/rxjs"
import type { Pagination } from "./Pagination"
import type { PaginationEdge, PaginationInfo } from "./types"

const VISIBILITY_THRESHOLD: { type: "percentage"; value: number } = {
  type: "percentage",
  value: 0.5,
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
     * Results are produced by the pipeline rather than written into the
     * entity from side effects, but the stream shape is kept as it was: the
     * metrics pass feeds the positions pass, and both publish.
     *
     * `share()` is what removes the duplicated work. Previously the two were
     * subscribed separately, and the metrics chain is cold, so its visible
     * item and page lookups ran once per subscriber.
     */
    const metrics$ = merge(
      this.context.bridgeEvent.navigation$,
      spine.layout$,
    ).pipe(
      switchMap(() =>
        /**
         * @important
         *
         * Metrics are resolved immediately so user feedback (navigation
         * buttons) is not delayed. Nothing there is heavier than a layout
         * lookup.
         *
         * We wait for the navigator to be unlocked first, which avoids
         * resolving while the user is panning for example. A locked navigator
         * is an unfinished navigation.
         */
        this.isNavigationLocked$.pipe(
          filter((isLocked) => !isLocked),
          take(1),
          withLatestFrom(this.context.bridgeEvent.navigation$),
          map(([, navigation]) => {
            /**
             * When the visible items cannot be resolved, the previous result
             * is carried through unchanged. That keeps the behaviour this
             * refactor found: the positions pass used to run in this case too,
             * against whatever the entity already held.
             */
            return this.resolveMetrics(navigation) ?? this.pagination.value
          }),
        ),
      ),
      share(),
    )

    /**
     * Heavy operation, needs to be optimized as much as possible.
     *
     * @todo add more optimization, comparing item before, after with position,
     * etc
     */
    const positions$ = metrics$.pipe(
      waitForSwitch(this.context.bridgeEvent.viewportFree$),
      map((metrics) => this.resolvePositions(metrics)),
      filter((result): result is PaginationInfo => result !== undefined),
    )

    merge(metrics$, positions$)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.pagination.update(result)
      })
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
   */
  private resolvePositions(
    metrics: PaginationInfo,
  ): PaginationInfo | undefined {
    const begin = this.resolveEdgePositions(metrics.begin)
    const end = this.resolveEdgePositions(metrics.end)

    if (!begin || !end) return undefined

    return { ...metrics, begin, end }
  }

  // @todo only update long cfi if the item layout change but specifically its content
  private resolveEdgePositions(
    edge: PaginationEdge,
  ): PaginationEdge | undefined {
    const { spineItemIndex, pageIndexInSpineItem } = edge

    if (spineItemIndex === undefined || pageIndexInSpineItem === undefined)
      return undefined

    const spineItem = this.spineItemsManager.get(spineItemIndex)

    if (!spineItem) return undefined

    const pageEntry = this.spine.pages.fromSpineItemPageIndex(
      spineItem,
      pageIndexInSpineItem,
    )

    return { ...edge, cfi: this.resolveCfi(spineItem, pageEntry) }
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
