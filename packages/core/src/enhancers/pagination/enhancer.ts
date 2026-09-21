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
  combineLatest,
  distinctUntilChanged,
  map,
  tap,
} from "rxjs"
import { isSamePaginationResult } from "../../pagination/edges"
import type { PaginationEdge } from "../../pagination/types"
import { Report } from "../../report"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { ResourcesLocator } from "./ResourcesLocator"
import { trackPaginationInfo } from "./trackPaginationInfo"
import type {
  EnhancerPaginationEdge,
  EnhancerPaginationInto,
  PaginationEnhancerAPI,
} from "./types"

export type { EnhancerPaginationInto, PaginationEnhancerAPI } from "./types"

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
     * Nothing is known about chapters until {@link trackPaginationInfo} emits,
     * so the seed carries the edges as they are with the enhancer's own fields
     * left empty.
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

    /**
     * Settlement is granted by the enrichment and revoked by the core result,
     * so the published result is a function of both rather than something two
     * writers keep in sync.
     *
     * An enrichment carries its settlement only while the result it was built
     * from is still the current one. Enrichment is throttled, so one built for
     * the previous page can arrive after the reader has settled on the next,
     * and comparing the live flag alone would let it through.
     */
    const enhancedPagination$ = combineLatest([
      trackPaginationInfo(reader).pipe(
        tap(({ info }) => Report.log(`Pagination`, info)),
      ),
      reader.pagination.state$,
    ]).pipe(
      map(
        ([{ source, info }, current]): EnhancerPaginationInto =>
          info.isSettled && source === current
            ? info
            : { ...info, isSettled: false },
      ),
      distinctUntilChanged(isSamePaginationResult),
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
