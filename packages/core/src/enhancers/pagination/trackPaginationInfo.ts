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
import { observeSettledNavigation } from "../../navigation/operators"
import { isSamePaginationResult } from "../../pagination/edges"
import type { PaginationEdge, PaginationInfo } from "../../pagination/types"
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

type ChapterPaginationEdge = Pick<
  PaginationEdge,
  "spineItemIndex" | "pageIndexInSpineItem"
>

type ChapterPaginationInfo = {
  begin: ChapterPaginationEdge
  end: ChapterPaginationEdge
}

/**
 * Both edges resolve their chapter the same way, so this describes one edge and
 * is applied to each rather than written out twice side by side.
 */
const mapEdgeChapterInfo = ({
  spineItem,
  pageIndexInSpineItem,
  chaptersData,
  pagesState,
}: {
  spineItem: SpineItem | undefined
  pageIndexInSpineItem: number | undefined
  chaptersData: ChaptersData
  pagesState: PagesState
}) => {
  const pageEntry =
    spineItem && pageIndexInSpineItem !== undefined
      ? Pages.fromSpineItemPageIndex(
          pagesState,
          spineItem.index,
          pageIndexInSpineItem,
        )
      : undefined

  const chapterInfoFromVisibleNode = spineItem
    ? resolveChapterInfoFromVisibleNode({
        node: pageEntry?.firstVisibleNode?.node,
        offset: pageEntry?.firstVisibleNode?.offset,
        candidates:
          chaptersData.tocCandidatesBySpineHref.get(spineItem.item.href) ?? [],
        spineItem,
        nextPageEntry: pageEntry
          ? Pages.fromNextPageWithinSameSpineItem(pagesState, pageEntry)
          : undefined,
      })
    : undefined

  return {
    chapterInfo:
      chapterInfoFromVisibleNode ??
      (spineItem ? chaptersData.chaptersInfo[spineItem.item.id] : undefined),
    spineItemReadingDirection: spineItem?.readingDirection,
    absolutePageIndex: pageEntry?.absolutePageIndex,
  }
}

const mapTotalsFromPagesState = ({
  items,
  pagesState,
}: {
  items: readonly SpineItem[]
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
  const endItem = reader.spineItemsManager.get(
    paginationInfo.end.spineItemIndex,
  )

  return endItem
    ? getPercentageEstimate(
        reader,
        paginationInfo.end.spineItemIndex ?? 0,
        paginationInfo.end.pageIndexInSpineItem || 0,
        navigationPosition,
        endItem,
        manifest,
      )
    : of(0)
}

const observeChaptersData = (reader: Reader & LayoutEnhancerOutput) =>
  of(reader.context.manifest).pipe(
    map((manifest): ChaptersData => {
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

const mapChapterPaginationEdge = ({
  spineItemIndex,
  pageIndexInSpineItem,
}: PaginationEdge): ChapterPaginationEdge => ({
  spineItemIndex,
  pageIndexInSpineItem,
})

const mapChapterPaginationInfo = (
  paginationInfo: PaginationInfo,
): ChapterPaginationInfo => ({
  begin: mapChapterPaginationEdge(paginationInfo.begin),
  end: mapChapterPaginationEdge(paginationInfo.end),
})

export const trackPaginationInfo = (reader: Reader & LayoutEnhancerOutput) => {
  const pagination$ = reader.pagination.state$
  const pagesState$ = reader.spine.pages.layout$
  const chaptersData$ = observeChaptersData(reader).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  )
  const chapterPaginationInfo$ = pagination$.pipe(
    map(mapChapterPaginationInfo),
    distinctUntilChanged(isSamePaginationResult),
  )

  const chaptersInfo$ = combineLatest([
    chapterPaginationInfo$,
    chaptersData$,
    pagesState$,
  ]).pipe(
    map(([paginationInfo, chaptersData, pagesState]) => {
      const mapEdge = (edge: ChapterPaginationEdge) =>
        mapEdgeChapterInfo({
          spineItem: reader.spineItemsManager.get(edge.spineItemIndex),
          pageIndexInSpineItem: edge.pageIndexInSpineItem,
          chaptersData,
          pagesState,
        })

      return {
        begin: mapEdge(paginationInfo.begin),
        end: mapEdge(paginationInfo.end),
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  )

  const isUsingSpread$ = reader.settings.watch(["computedSpreadMode"]).pipe(
    map((settings) => settings.computedSpreadMode ?? false),
    distinctUntilChanged(),
  )

  const totals$ = pagesState$.pipe(
    map((pagesState) =>
      mapTotalsFromPagesState({
        items: reader.spineItemsManager.items,
        pagesState,
      }),
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
      // the edges are merged rather than replaced: each side contributes part
      begin: { ...pagination.begin, ...chaptersInfo.begin },
      end: { ...pagination.end, ...chaptersInfo.end },
      isUsingSpread,
      ...totals,
    })),
  )

  const settledPosition$ = observeSettledNavigation(reader.navigation).pipe(
    map(({ position }) => position),
    distinctUntilChanged(isShallowEqual),
  )

  const progression$ = combineLatest([
    pagination$,
    reader.layout$,
    settledPosition$,
  ]).pipe(
    switchMap(([paginationInfo, _layout, navigationPosition]) =>
      getProgressionForPagination({
        reader,
        paginationInfo,
        navigationPosition,
        manifest: reader.context.manifest,
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
    distinctUntilChanged(isSamePaginationResult),
    auditTime(5),
  )
}
