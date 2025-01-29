import {
  BehaviorSubject,
  type Observable,
  type ObservedValueOf,
  combineLatest,
  combineLatestWith,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
  tap,
} from "rxjs"
import { trackChapterInfo } from "./chapters"
import type {
  EnhancerPaginationInto,
  ExtraPaginationInfo,
  ReaderWithProgression,
} from "./types"
import { isShallowEqual } from "../../utils/objects"
import { trackTotalPages } from "./spine"
import type { PaginationInfo } from "../../pagination/Pagination"
import { Reader } from "../../reader"

export const mapPaginationInfoToExtendedInfo = (
  reader: ReaderWithProgression,
  paginationInfo: PaginationInfo,
  chaptersInfo: ObservedValueOf<ReturnType<typeof trackChapterInfo>>,
  percentageEstimateOfBook: number,
): Observable<
  Omit<
    ExtraPaginationInfo,
    | "beginAbsolutePageIndex"
    | "endAbsolutePageIndex"
    | "beginAbsolutePageIndex"
    | "numberOfTotalPages"
  >
> => {
  const context = reader.context
  const beginItem =
    paginationInfo.beginSpineItemIndex !== undefined
      ? reader.spineItemsManager.get(paginationInfo.beginSpineItemIndex)
      : undefined
  const endItem =
    paginationInfo.endSpineItemIndex !== undefined
      ? reader.spineItemsManager.get(paginationInfo.endSpineItemIndex)
      : undefined

  return of({
    ...paginationInfo,
    beginChapterInfo: beginItem ? chaptersInfo[beginItem.item.id] : undefined,
    // chapterIndex: number;
    // pages: number;
    // pageIndexInBook: number;
    // pageIndexInChapter: number;
    // pagesOfChapter: number;
    // pagePercentageInChapter: number;
    // offsetPercentageInChapter: number;
    // domIndex: number;
    // charOffset: number;
    // serializeString?: string;
    beginSpineItemReadingDirection: beginItem?.readingDirection,
    endChapterInfo: endItem ? chaptersInfo[endItem.item.id] : undefined,
    endSpineItemReadingDirection: endItem?.readingDirection,
    // spineItemReadingDirection: focusedSpineItem?.getReadingDirection(),
    /**
     * This percentage is based of the weight (kb) of every items and the number of pages.
     * It is not accurate but gives a general good idea of the overall progress.
     * It is recommended to use this progress only for reflow books. For pre-paginated books
     * the number of pages and current index can be used instead since 1 page = 1 chapter.
     */
    percentageEstimateOfBook,
    isUsingSpread: context.state.isUsingSpreadMode ?? false,
    // hasNextChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
    // hasPreviousChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
    // numberOfSpineItems: context.manifest?.readingOrder.length,
  })
}

const observeProgression = (reader: ReaderWithProgression) => {
  return combineLatest([
    reader.pagination.state$,
    // Usually pagination change if layout changes (number of pages) however it is especially
    // useful for like webtoon where you still have one page but only the layout will give you the final size
    // although the pagination will stay stable from the begining
    reader.layout$,
  ]).pipe(
    switchMap(([paginationInfo]) => {
      const endItem =
        paginationInfo.endSpineItemIndex !== undefined
          ? reader.spineItemsManager.get(paginationInfo.endSpineItemIndex)
          : undefined

      return endItem
        ? reader.progression.getPercentageEstimate(
            reader.context,
            paginationInfo.endSpineItemIndex ?? 0,
            paginationInfo.endNumberOfPagesInSpineItem,
            paginationInfo.endPageIndexInSpineItem || 0,
            reader.navigation.getNavigation().position,
            endItem,
          )
        : of(0)
    }),
  )
}

export const trackPaginationInfo = (reader: ReaderWithProgression) => {
  const chaptersInfo$ = trackChapterInfo(reader)
  const totalPages$ = trackTotalPages(reader)
  const currentValue = new BehaviorSubject<EnhancerPaginationInto>({
    ...reader.pagination.getState(),
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

  const extandedBasePagination$ = combineLatest([
    reader.pagination.state$,
    chaptersInfo$,
    observeProgression(reader),
  ]).pipe(
    switchMap(([info, chaptersInfo, percentageEstimateOfBook]) =>
      mapPaginationInfoToExtendedInfo(
        reader,
        info,
        chaptersInfo,
        percentageEstimateOfBook,
      ).pipe(
        map((extendedInfo) => ({
          ...info,
          ...extendedInfo,
        })),
      ),
    ),
    distinctUntilChanged(isShallowEqual),
  )

  const paginationInfo$: Observable<EnhancerPaginationInto> = combineLatest([
    extandedBasePagination$,
    totalPages$,
  ]).pipe(
    map(([pageInfo, totalPageInfo]) => ({
      ...pageInfo,
      ...totalPageInfo,
      beginAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
        .slice(0, pageInfo.beginSpineItemIndex)
        .reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          pageInfo.beginPageIndexInSpineItem ?? 0,
        ),
      endAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
        .slice(0, pageInfo.endSpineItemIndex)
        .reduce(
          (acc, numberOfPagesForItem) => acc + numberOfPagesForItem,
          pageInfo.endPageIndexInSpineItem ?? 0,
        ),
    })),
    tap((value) => {
      currentValue.next(value)
    }),
    shareReplay(1),
  )

  return { paginationInfo$, getPaginationInfo: () => currentValue.value }
}
