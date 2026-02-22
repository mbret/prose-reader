import { isShallowEqual, type Manifest } from "@prose-reader/shared"
import {
  auditTime,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap,
} from "rxjs"
import type { PaginationInfo } from "../../pagination/types"
import type { Reader } from "../../reader"
import { Pages, type PagesState } from "../../spine/Pages"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import {
  buildStaticChaptersInfo,
  buildTocCandidatesBySpineHref,
  buildTocIndex,
  resolveChapterInfoFromVisibleNode,
  type TocCandidatesBySpineHref,
} from "./chapters"
import { getPercentageEstimate } from "./progression"

type ChaptersData = {
  tocCandidatesBySpineHref: TocCandidatesBySpineHref
  chaptersInfo: ReturnType<typeof buildStaticChaptersInfo>
}

type ChapterPaginationInfo = Pick<
  PaginationInfo,
  | "beginSpineItemIndex"
  | "beginPageIndexInSpineItem"
  | "endSpineItemIndex"
  | "endPageIndexInSpineItem"
>

const EMPTY_CHAPTERS_DATA: ChaptersData = {
  tocCandidatesBySpineHref: new Map(),
  chaptersInfo: {},
}

const mapChapterInfo = ({
  beginItem,
  endItem,
  paginationInfo,
  chaptersData,
  pagesState,
}: {
  beginItem: SpineItem | undefined
  endItem: SpineItem | undefined
  paginationInfo: ChapterPaginationInfo
  chaptersData: ChaptersData
  pagesState: PagesState
}) => {
  const beginPageEntry =
    beginItem && paginationInfo.beginPageIndexInSpineItem !== undefined
      ? Pages.fromSpineItemPageIndex(
          pagesState,
          beginItem.index,
          paginationInfo.beginPageIndexInSpineItem,
        )
      : undefined
  const beginNextPageEntry = beginPageEntry
    ? Pages.fromNextPageWithinSameSpineItem(pagesState, beginPageEntry)
    : undefined

  const endPageEntry =
    endItem && paginationInfo.endPageIndexInSpineItem !== undefined
      ? Pages.fromSpineItemPageIndex(
          pagesState,
          endItem.index,
          paginationInfo.endPageIndexInSpineItem,
        )
      : undefined
  const endNextPageEntry = endPageEntry
    ? Pages.fromNextPageWithinSameSpineItem(pagesState, endPageEntry)
    : undefined

  const beginChapterInfoFromVisibleNode = beginItem
    ? resolveChapterInfoFromVisibleNode({
        node: beginPageEntry?.firstVisibleNode?.node,
        offset: beginPageEntry?.firstVisibleNode?.offset,
        candidates:
          chaptersData.tocCandidatesBySpineHref.get(beginItem.item.href) ?? [],
        spineItem: beginItem,
        nextPageEntry: beginNextPageEntry,
      })
    : undefined
  const endChapterInfoFromVisibleNode = endItem
    ? resolveChapterInfoFromVisibleNode({
        node: endPageEntry?.firstVisibleNode?.node,
        offset: endPageEntry?.firstVisibleNode?.offset,
        candidates:
          chaptersData.tocCandidatesBySpineHref.get(endItem.item.href) ?? [],
        spineItem: endItem,
        nextPageEntry: endNextPageEntry,
      })
    : undefined

  return {
    beginChapterInfo:
      beginChapterInfoFromVisibleNode ??
      (beginItem ? chaptersData.chaptersInfo[beginItem.item.id] : undefined),
    beginSpineItemReadingDirection: beginItem?.readingDirection,
    beginAbsolutePageIndex: beginPageEntry?.absolutePageIndex,
    endChapterInfo:
      endChapterInfoFromVisibleNode ??
      (endItem ? chaptersData.chaptersInfo[endItem.item.id] : undefined),
    endSpineItemReadingDirection: endItem?.readingDirection,
    endAbsolutePageIndex: endPageEntry?.absolutePageIndex,
  }
}

const mapTotalsFromPagesState = ({
  items,
  pagesState,
}: {
  items: SpineItem[]
  pagesState: PagesState
}) => {
  const numberOfPagesPerItems = items.map(() => 0)

  for (const page of pagesState.pages) {
    numberOfPagesPerItems[page.itemIndex] =
      (numberOfPagesPerItems[page.itemIndex] ?? 0) + 1
  }

  return {
    numberOfPagesPerItems,
    /**
     * This may be not accurate for reflowable due to dynamic load / unload.
     */
    numberOfTotalPages: pagesState.pages.length,
  }
}

type TotalsInfo = ReturnType<typeof mapTotalsFromPagesState>

const areTotalsEqual = (previous: TotalsInfo, next: TotalsInfo) => {
  if (previous.numberOfTotalPages !== next.numberOfTotalPages) {
    return false
  }

  if (
    previous.numberOfPagesPerItems.length !== next.numberOfPagesPerItems.length
  ) {
    return false
  }

  return previous.numberOfPagesPerItems.every(
    (numberOfPages, index) =>
      numberOfPages === next.numberOfPagesPerItems[index],
  )
}

const getProgressionForPagination = ({
  reader,
  paginationInfo,
  navigationPosition,
  manifest,
}: {
  reader: Reader & LayoutEnhancerOutput
  paginationInfo: PaginationInfo
  navigationPosition: { x: number; y: number }
  manifest: Manifest
}) => {
  const endItem = reader.spineItemsManager.get(paginationInfo.endSpineItemIndex)

  return endItem
    ? getPercentageEstimate(
        reader,
        paginationInfo.endSpineItemIndex ?? 0,
        paginationInfo.endPageIndexInSpineItem || 0,
        navigationPosition,
        endItem,
        manifest,
      )
    : of(0)
}

const observeChaptersData = (reader: Reader & LayoutEnhancerOutput) =>
  reader.context.manifest$.pipe(
    map((manifest): ChaptersData => {
      if (!manifest) {
        return EMPTY_CHAPTERS_DATA
      }

      const tocIndex = buildTocIndex(manifest.nav?.toc ?? [], manifest)
      const tocCandidatesBySpineHref = buildTocCandidatesBySpineHref({
        manifest,
        tocIndex,
      })

      return {
        tocCandidatesBySpineHref,
        chaptersInfo: buildStaticChaptersInfo(manifest, tocIndex),
      }
    }),
  )

const mapChapterPaginationInfo = (
  paginationInfo: PaginationInfo,
): ChapterPaginationInfo => ({
  beginSpineItemIndex: paginationInfo.beginSpineItemIndex,
  beginPageIndexInSpineItem: paginationInfo.beginPageIndexInSpineItem,
  endSpineItemIndex: paginationInfo.endSpineItemIndex,
  endPageIndexInSpineItem: paginationInfo.endPageIndexInSpineItem,
})

export const trackPaginationInfo = (reader: Reader & LayoutEnhancerOutput) => {
  const pagination$ = reader.pagination.state$
  const pagesState$ = reader.spine.pages.layout$
  const chaptersData$ = observeChaptersData(reader).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  const chapterPaginationInfo$ = pagination$.pipe(
    map(mapChapterPaginationInfo),
    distinctUntilChanged(isShallowEqual),
  )

  const chaptersInfo$ = combineLatest([
    chapterPaginationInfo$,
    chaptersData$,
    pagesState$,
  ]).pipe(
    map(([paginationInfo, chaptersData, pagesState]) => {
      const beginItem = reader.spineItemsManager.get(
        paginationInfo.beginSpineItemIndex,
      )
      const endItem = reader.spineItemsManager.get(
        paginationInfo.endSpineItemIndex,
      )

      return mapChapterInfo({
        beginItem,
        endItem,
        paginationInfo,
        chaptersData,
        pagesState,
      })
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const isUsingSpread$ = reader.settings.watch(["computedSpreadMode"]).pipe(
    map((settings) => settings.computedSpreadMode ?? false),
    distinctUntilChanged(),
  )

  const totals$ = combineLatest([
    pagesState$,
    reader.spineItemsManager.items$,
  ]).pipe(
    map(([pagesState, items]) =>
      mapTotalsFromPagesState({ items, pagesState }),
    ),
    distinctUntilChanged(areTotalsEqual),
  )

  const basePaginationInfo$ = combineLatest([
    pagination$,
    isUsingSpread$,
    chaptersInfo$,
    totals$,
  ]).pipe(
    map(([pagination, isUsingSpread, chaptersInfo, totals]) => ({
      ...pagination,
      ...chaptersInfo,
      isUsingSpread,
      ...totals,
    })),
  )

  const progression$ = combineLatest([
    pagination$,
    reader.layout$,
    reader.navigation.navigation$,
    reader.context.manifest$,
  ]).pipe(
    switchMap(([paginationInfo, _layout, navigation, manifest]) =>
      getProgressionForPagination({
        reader,
        paginationInfo,
        navigationPosition: navigation.position,
        manifest,
      }),
    ),
    map((progression) => ({
      /**
       * This percentage is based of the weight (kb) of every items and the number of pages.
       * It is not accurate but gives a general good idea of the overall progress.
       * It is recommended to use this progress only for reflow books. For pre-paginated books
       * the number of pages and current index can be used instead since 1 page = 1 chapter.
       */
      percentageEstimateOfBook: progression,
    })),
  )

  return combineLatest([basePaginationInfo$, progression$]).pipe(
    map(([basePaginationInfo, progression]) => ({
      ...basePaginationInfo,
      ...progression,
    })),
    distinctUntilChanged(isShallowEqual),
    auditTime(5),
  )
}
