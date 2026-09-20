/**
 * @important
 *
 * Chapter and progress calculations are throttled to smooth out layout changes.
 * Readiness is invalidated immediately, so the retained pagination snapshot cannot
 * be mistaken for settled progress while its replacement is being calculated.
 */
import { isShallowEqual } from "@prose-reader/shared"
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  tap,
} from "rxjs"
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
    const initialPagination: EnhancerPaginationInto = {
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
    }
    const enhancedPagination = new BehaviorSubject({
      source: reader.pagination.state,
      info: initialPagination,
    })

    const resourcesLocator = new ResourcesLocator(reader)

    const paginationSub = trackPaginationInfo(reader)
      .pipe(tap((paginationInfo) => Report.log(`Pagination`, paginationInfo)))
      .subscribe(enhancedPagination)

    const currentPagination = (
      snapshot: typeof enhancedPagination.value,
      current: typeof reader.pagination.state,
    ): EnhancerPaginationInto =>
      snapshot.source === current && current.isSettled
        ? snapshot.info
        : { ...snapshot.info, isSettled: false }

    const pagination$ = combineLatest([
      enhancedPagination,
      reader.pagination.state$,
    ]).pipe(
      map(([snapshot, current]) => currentPagination(snapshot, current)),
      distinctUntilChanged(isShallowEqual),
    )
    const navigationState$ = combineLatest([
      reader.navigation.navigationState$,
      pagination$,
    ]).pipe(
      map(([navigation, pagination]) => ({
        ...navigation,
        isSettled: navigation.isSettled && pagination.isSettled,
      })),
      distinctUntilChanged(isShallowEqual),
    )

    return {
      ...reader,
      navigation: {
        ...reader.navigation,
        navigationState$,
        settled$: navigationState$.pipe(
          map((state) => state.isSettled),
          distinctUntilChanged(),
        ),
      },
      locateResource: resourcesLocator.locateResource.bind(resourcesLocator),
      destroy: () => {
        paginationSub.unsubscribe()
        enhancedPagination.complete()
        reader.destroy()
      },
      pagination: {
        ...reader.pagination,
        get state() {
          return currentPagination(
            enhancedPagination.value,
            reader.pagination.state,
          )
        },
        get state$() {
          return pagination$
        },
      },
    } as unknown as PaginationOutput
  }
