/**
 * @important
 *
 * The enhanced pagination state does not emit transient states, it uses a throttling
 * to smooth out the state changes. Pagination is built from many different sources and during
 * transition of reader state, many non-final states could be emitted and would not bring much value
 * to the user. This is an opinionated decision for this API
 */
import {
  BehaviorSubject,
  distinctUntilChanged,
  map,
  switchMap,
  tap,
} from "rxjs"
import {
  isSamePaginationResult,
  withSettlementOf,
} from "../../pagination/edges"
import type { PaginationEdge, VisibleRange } from "../../pagination/types"
import { Report } from "../../report"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { ResourcesLocator } from "./ResourcesLocator"
import {
  type PaginationEnrichment,
  trackPaginationEnrichment,
} from "./trackPaginationEnrichment"
import type {
  EnhancerPaginationEdge,
  EnhancerPaginationInto,
  PaginationEnhancerAPI,
} from "./types"

export type { EnhancerPaginationInto, PaginationEnhancerAPI } from "./types"

/**
 * The published result: the core's edges with this enhancer's fields merged
 * onto them.
 *
 * Settlement is decided here and nowhere else. It is granted only from the
 * core result the enrichment was built from, and only while that is still the
 * current one. Enrichment is throttled, so one built for the previous page can
 * arrive after the reader has settled on the next — it is simply never granted
 * settlement, rather than handed one and having it taken back. Comparing the
 * core's live flag instead of the result itself would let it through.
 */
const publishEnrichment = (
  { source, begin, end, ...extras }: PaginationEnrichment,
  describesCurrentResult: boolean,
): EnhancerPaginationInto => {
  /**
   * Each edge is merged rather than replaced: the core contributes the
   * position, this enhancer the chapter.
   */
  const edges = {
    begin: { ...source.begin, ...begin },
    end: { ...source.end, ...end },
  }

  const visibleRange: VisibleRange<EnhancerPaginationEdge> =
    describesCurrentResult
      ? withSettlementOf(source, edges)
      : { isSettled: false, ...edges }

  return { navigationId: source.navigationId, ...extras, ...visibleRange }
}

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<RootEnhancer> & LayoutEnhancerOutput,
    PaginationOutput extends PaginationEnhancerAPI<InheritOutput>,
  >(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): PaginationOutput => {
    const reader = next(options)
    /**
     * Nothing is known about chapters until
     * {@link trackPaginationEnrichment} emits, so the seed carries the edges
     * as they are with the enhancer's own fields left empty.
     */
    const unenrichedEdge = (edge: PaginationEdge): EnhancerPaginationEdge => ({
      ...edge,
      chapterInfo: undefined,
      spineItemReadingDirection: undefined,
      absolutePageIndex: 0,
    })

    const unenrichedPagination: EnhancerPaginationInto = {
      ...reader.pagination.state,
      isSettled: false,
      begin: unenrichedEdge(reader.pagination.state.begin),
      end: unenrichedEdge(reader.pagination.state.end),
      isUsingSpread: false,
      numberOfTotalPages: 0,
      percentageEstimateOfBook: 0,
    }

    const enhancedPagination$ = trackPaginationEnrichment(reader).pipe(
      switchMap((enrichment) =>
        /**
         * Whether this enrichment still describes the current core result is
         * the only thing about the core that the published value depends on,
         * so the core moving on rebuilds only when that answer changes.
         */
        reader.pagination.state$.pipe(
          map((current) => enrichment.source === current),
          distinctUntilChanged(),
          map((describesCurrentResult) =>
            publishEnrichment(enrichment, describesCurrentResult),
          ),
        ),
      ),
      distinctUntilChanged(isSamePaginationResult),
      tap((paginationInfo) => Report.log(`Pagination`, paginationInfo)),
    )

    const resourcesLocator = new ResourcesLocator(reader)

    /**
     * `state` is read synchronously, so the derived result is kept here.
     * Nothing writes to it but the stream above.
     */
    const enhancedPagination = new BehaviorSubject<EnhancerPaginationInto>(
      unenrichedPagination,
    )
    const paginationSub = enhancedPagination$.subscribe(enhancedPagination)

    return {
      ...reader,
      locateResource: resourcesLocator.locateResource.bind(resourcesLocator),
      destroy: () => {
        paginationSub.unsubscribe()
        reader.destroy()
      },
      pagination: {
        ...reader.pagination,
        get state() {
          return enhancedPagination.value
        },
        get state$() {
          return enhancedPagination.asObservable()
        },
      },
    } as unknown as PaginationOutput
  }
