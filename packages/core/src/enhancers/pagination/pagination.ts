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

export const mapPaginationInfoToExtendedInfo = (
  reader: ReaderWithProgression,
  paginationInfo: PaginationInfo,
  chaptersInfo: ObservedValueOf<ReturnType<typeof trackChapterInfo>>,
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

  const endItemProgression$ = endItem
    ? reader.progression.getPercentageEstimate(
        context,
        paginationInfo.endSpineItemIndex ?? 0,
        paginationInfo.endNumberOfPagesInSpineItem,
        paginationInfo.endPageIndexInSpineItem || 0,
        reader.navigation.getNavigation().position,
        endItem,
      )
    : of(0)

  return endItemProgression$.pipe(
    map((percentageEstimateOfBook) => ({
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
    })),
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

  const extandedBasePagination$ = reader.pagination.state$.pipe(
    combineLatestWith(chaptersInfo$),

    switchMap(([info, chaptersInfo]) =>
      mapPaginationInfoToExtendedInfo(reader, info, chaptersInfo).pipe(
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
