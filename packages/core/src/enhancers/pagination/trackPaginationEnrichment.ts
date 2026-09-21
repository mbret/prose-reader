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
import type { EnhancerPaginationEdge, ExtraPaginationInfo } from "./types"

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

/** What this enhancer adds to an edge the core already published. */
type EdgeEnrichment = Omit<EnhancerPaginationEdge, keyof PaginationEdge>

type ChaptersInfo = {
  begin: EdgeEnrichment
  end: EdgeEnrichment
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
}): EdgeEnrichment => {
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

/**
 * What this enhancer adds to a pagination result, alongside the core result it
 * was computed from.
 *
 * It deliberately carries no settlement. Settlement belongs to the core result
 * and is granted once, where this is joined back to the result that is
 * current — an enrichment that never claims settlement can never have one
 * taken back from it.
 *
 * `source` is what makes that join possible. Enrichment is throttled, so by
 * the time one is published the reader may have moved on.
 */
export type PaginationEnrichment = ExtraPaginationInfo & {
  source: PaginationInfo
  begin: EdgeEnrichment
  end: EdgeEnrichment
}

export const trackPaginationEnrichment = (
  reader: Reader & LayoutEnhancerOutput,
) => {
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

      const chaptersInfo: ChaptersInfo = {
        begin: mapEdge(paginationInfo.begin),
        end: mapEdge(paginationInfo.end),
      }

      return chaptersInfo
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

  const settledPosition$ = observeSettledNavigation(reader.navigation).pipe(
    map(({ position }) => position),
    distinctUntilChanged(isShallowEqual),
  )

  /**
   * Every value comes from the same captured pagination result rather than
   * from streams sampled independently, so an enrichment cannot pair one
   * result's pages with another's progression.
   */
  return combineLatest([
    pagination$,
    isUsingSpread$,
    chaptersInfo$,
    totals$,
    // a layout can change the progression without changing the pagination
    reader.layout$,
    settledPosition$,
  ]).pipe(
    switchMap(
      ([source, isUsingSpread, chaptersInfo, totals, , navigationPosition]) =>
        getProgressionForPagination({
          reader,
          paginationInfo: source,
          navigationPosition,
          manifest: reader.context.manifest,
        }).pipe(
          map(
            (percentageEstimateOfBook): PaginationEnrichment => ({
              source,
              begin: chaptersInfo.begin,
              end: chaptersInfo.end,
              isUsingSpread,
              numberOfTotalPages: totals.numberOfTotalPages,
              percentageEstimateOfBook,
            }),
          ),
        ),
    ),
    /**
     * The edges are compared by value and `source` by reference, so an
     * enrichment built from a new core result counts as a change even when
     * every enriched value is identical — the source is what settlement is
     * granted against downstream.
     */
    distinctUntilChanged(isSamePaginationResult),
    auditTime(5),
  )
}
