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
import { isSamePaginationResult } from "../../pagination/edges"
import type { PaginationEdge } from "../../pagination/types"
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
  EnhancerPaginationInfo,
  PaginationEnhancerAPI,
} from "./types"

export type { EnhancerPaginationInfo, PaginationEnhancerAPI } from "./types"

/**
 * Two returns rather than one spread: the settled variant types each edge's
 * cfi as present, and TypeScript only sees that when the edges are built
 * under the narrowing of `source`.
 */
const publishEnrichment = (
  { source, begin, end, ...extras }: PaginationEnrichment,
  describesCurrentResult: boolean,
): EnhancerPaginationInfo => {
  if (source.isSettled && describesCurrentResult) {
    return {
      ...extras,
      ...source,
      begin: { ...source.begin, ...begin },
      end: { ...source.end, ...end },
    }
  }

  return {
    ...extras,
    ...source,
    isSettled: false,
    begin: { ...source.begin, ...begin },
    end: { ...source.end, ...end },
  }
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
     * Stands in until the first enrichment, which waits for a layout: none of
     * what the enhancer adds is known before it.
     */
    const unenrichedEdge = (edge: PaginationEdge): EnhancerPaginationEdge => ({
      ...edge,
      chapterInfo: undefined,
      spineItemReadingDirection: undefined,
      absolutePageIndex: undefined,
    })

    const unenrichedPagination: EnhancerPaginationInfo = {
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
         * Enrichment is throttled, so it can describe a core result the reader
         * has since replaced. That is the only thing about the core the
         * published value depends on, so it rebuilds only when that changes.
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
    const enhancedPagination = new BehaviorSubject<EnhancerPaginationInfo>(
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
