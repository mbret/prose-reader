/**
 * @important
 *
 * The enhanced pagination state does not emit transient states, it uses a throttling
 * to smooth out the state changes. Pagination is built from many different sources and during
 * transition of reader state, many non-final states could be emitted and would not bring much value
 * to the user. This is an opinionated decision for this API
 */
import { BehaviorSubject, tap } from "rxjs"
import { Report } from "../../report"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { ResourcesLocator } from "./ResourcesLocator"
import { trackPaginationInfo } from "./trackPaginationInfo"
import type { EnhancerPaginationInto, PaginationEnhancerAPI } from "./types"

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
    const enhancedPagination = new BehaviorSubject<EnhancerPaginationInto>({
      ...reader.pagination.state,
      beginChapterInfo: undefined,
      beginCfi: undefined,
      beginPageIndexInSpineItem: undefined,
      isUsingSpread: false,
      beginAbsolutePageIndex: 0,
      endAbsolutePageIndex: 0,
      numberOfTotalPages: 0,
      beginSpineItemReadingDirection: undefined,
      beginSpineItemIndex: undefined,
      endCfi: undefined,
      endChapterInfo: undefined,
      endSpineItemReadingDirection: undefined,
      percentageEstimateOfBook: 0,
    })

    const resourcesLocator = new ResourcesLocator(reader)

    const paginationSub = trackPaginationInfo(reader)
      .pipe(tap((paginationInfo) => Report.log(`Pagination`, paginationInfo)))
      .subscribe(enhancedPagination)

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
          return enhancedPagination
        },
      },
    } as unknown as PaginationOutput
  }
