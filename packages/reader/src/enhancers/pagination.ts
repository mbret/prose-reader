import { animationFrameScheduler, combineLatest, Observable, ObservedValueOf } from "rxjs"
import { map, debounceTime, startWith, shareReplay, distinctUntilChanged, withLatestFrom, takeUntil, tap } from "rxjs/operators"
import { SpineItem } from "../spineItem/createSpineItem"
import { Manifest } from "../types"
import { progressionEnhancer } from "./progression"
import { getNumberOfPages } from "../pagination"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { EnhancerOutput } from "./types/enhancer"

type ProgressionEnhancer = typeof progressionEnhancer

const NAMESPACE = `paginationEnhancer`

const report = Report.namespace(NAMESPACE)

/**
 * @todo
 * Using recursive here provoke this error
 * https://www.google.com/search?q=recursive+Exported+variable+has+or+is+using+namefrom+external+module+but+cannot+be+named.&rlz=1C5CHFA_en&sxsrf=AOaemvK4craypli45-fXfFRdfO82ibGRog%3A1631106978791&ei=orc4YZPUL-6tmAWJgKT4Dw&oq=recursive+Exported+variable+has+or+is+using+namefrom+external+module+but+cannot+be+named.&gs_lcp=Cgdnd3Mtd2l6EAM6BwgAEEcQsANKBAhBGABQjgdYjgdgtQtoAnACeACAAWGIAWGSAQExmAEAoAEByAEIwAEB&sclient=gws-wiz&ved=0ahUKEwiTrb6Au-_yAhXuFqYKHQkACf8Q4dUDCA4&uact=5
 * My guess is that something is wrong and I have too many recursive / inferred types everywhere and especially on the enhancer thingy.
 */
type ChapterInfo = {
  title: string
  subChapter?: {
    title: string
    subChapter?: {
      title: string
      subChapter?: {
        title: string
        path: string
      }
      path: string
    }
    path: string
  }
  path: string
}

type PaginationInfo = {
  beginChapterInfo: ChapterInfo | undefined
  beginPageIndexInChapter: number | undefined
  beginNumberOfPagesInChapter: number | undefined
  beginSpineItemIndex: number | undefined
  beginCfi: string | undefined
  beginSpineItemReadingDirection: `rtl` | `ltr` | undefined
  beginAbsolutePageIndex: number | undefined
  endChapterInfo: ChapterInfo | undefined
  endPageIndexInChapter: number | undefined
  endNumberOfPagesInChapter: number | undefined
  endSpineItemIndex: number | undefined
  endCfi: string | undefined
  endSpineItemReadingDirection: `rtl` | `ltr` | undefined
  endAbsolutePageIndex: number | undefined
  percentageEstimateOfBook: number | undefined
  /**
   * @warning
   * This value is only correct for pre-paginated books and or
   * if you preload the entire book in case of reflow. This is because
   * items get loaded unloaded when navigating through the book, meaning
   * we cannot measure the number of pages accurately.
   */
  numberOfTotalPages: number | undefined
  isUsingSpread: boolean
  // numberOfSpineItems: number | undefined
  canGoLeft: boolean
  canGoRight: boolean
}

export const paginationEnhancer =
  <
    InheritOptions,
    InheritOutput extends EnhancerOutput<ProgressionEnhancer>,
    Pagination$ extends Observable<any> = InheritOutput["pagination$"]
  >(
    next: (options: InheritOptions) => InheritOutput
  ) =>
  (
    options: InheritOptions
  ): Omit<InheritOutput, "pagination$"> & {
    pagination$: Observable<ObservedValueOf<Pagination$> & PaginationInfo>
  } => {
    const reader = next(options)
    const chaptersInfo: { [key: string]: ChapterInfo | undefined } = {}

    const getChapterInfo = (item: Manifest[`spineItems`][number]) => {
      const manifest = reader.context.getManifest()
      return item && manifest && buildChapterInfoFromSpineItem(manifest, item)
    }

    const mapPaginationInfoToExtendedInfo = (
      paginationInfo: ObservedValueOf<typeof reader.pagination$>
    ): Omit<
      PaginationInfo,
      "beginAbsolutePageIndex" | "endAbsolutePageIndex" | "beginAbsolutePageIndex" | "numberOfTotalPages"
    > => {
      const context = reader.context
      const manifest = context.getManifest()
      const numberOfSpineItems = manifest?.spineItems.length ?? 0
      const beginItem =
        paginationInfo.beginSpineItemIndex !== undefined ? reader.getSpineItem(paginationInfo.beginSpineItemIndex) : undefined
      const endItem =
        paginationInfo.endSpineItemIndex !== undefined ? reader.getSpineItem(paginationInfo.endSpineItemIndex) : undefined

      const isAtAbsoluteBeginning = paginationInfo.beginSpineItemIndex === 0 && paginationInfo.beginPageIndex === 0
      const isAtAbsoluteEnd =
        paginationInfo.endPageIndex === paginationInfo.endNumberOfPages - 1 &&
        paginationInfo.endSpineItemIndex === Math.max(numberOfSpineItems - 1, 0)

      return {
        beginPageIndexInChapter: paginationInfo.beginPageIndex,
        beginNumberOfPagesInChapter: paginationInfo.beginNumberOfPages,
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
        beginSpineItemIndex: paginationInfo.beginSpineItemIndex,
        beginCfi: paginationInfo.beginCfi,
        beginSpineItemReadingDirection: beginItem?.getReadingDirection(),
        endChapterInfo: endItem ? chaptersInfo[endItem.item.id] : undefined,
        endPageIndexInChapter: paginationInfo.endPageIndex,
        endNumberOfPagesInChapter: paginationInfo.endNumberOfPages,
        endSpineItemIndex: paginationInfo.endSpineItemIndex,
        endSpineItemReadingDirection: endItem?.getReadingDirection(),
        endCfi: paginationInfo.endCfi,
        // spineItemReadingDirection: focusedSpineItem?.getReadingDirection(),
        /**
         * This percentage is based of the weight (kb) of every items and the number of pages.
         * It is not accurate but gives a general good idea of the overall progress.
         * It is recommended to use this progress only for reflow books. For pre-paginated books
         * the number of pages and current index can be used instead since 1 page = 1 chapter.
         */
        percentageEstimateOfBook: endItem
          ? reader.progression.getPercentageEstimate(
              context,
              paginationInfo.endSpineItemIndex ?? 0,
              paginationInfo.endNumberOfPages,
              paginationInfo.endPageIndex || 0,
              reader.getCurrentViewportPosition(),
              endItem
            )
          : 0,
        isUsingSpread: context.shouldDisplaySpread(),
        // hasNextChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
        // hasPreviousChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
        // numberOfSpineItems: context.getManifest()?.readingOrder.length,
        canGoLeft:
          (manifest?.readingDirection === "ltr" && !isAtAbsoluteBeginning) ||
          (manifest?.readingDirection === "rtl" && !isAtAbsoluteEnd),
        canGoRight:
          (manifest?.readingDirection === "ltr" && !isAtAbsoluteEnd) ||
          (manifest?.readingDirection === "rtl" && !isAtAbsoluteBeginning),
      }
    }

    const getSpineItemNumberOfPages = (spineItem: SpineItem) => {
      // pre-paginated always are only one page
      // if (!spineItem.isReflowable) return 1

      const writingMode = spineItem.spineItemFrame.getWritingMode()
      const { width, height } = spineItem.getElementDimensions()
      const settings = reader.context.getSettings()

      if (settings.pageTurnDirection === `vertical` && settings.pageTurnMode === `scrollable`) {
        return 1
      }

      if (writingMode === `vertical-rl`) {
        return getNumberOfPages(height, reader.context.getPageSize().height)
      }

      return getNumberOfPages(width, reader.context.getPageSize().width)
    }

    const getNumberOfPagesPerItems = () =>
      reader.getSpineItems().map((item) => {
        return getSpineItemNumberOfPages(item)
      }, 0)

    reader.spineItems$
      .pipe(
        tap((items) =>
          items.forEach(({ item }) => {
            chaptersInfo[item.id] = getChapterInfo(item)
          })
        ),
        takeUntil(reader.$.destroy$)
      )
      .subscribe()

    const innerPaginationExtendedInfo$ = reader.pagination$.pipe(
      map((info) => ({
        ...(info as ObservedValueOf<Pagination$>),
        ...mapPaginationInfoToExtendedInfo(info),
      })),
      distinctUntilChanged(isShallowEqual)
    )

    const totalPages$: Observable<{
      numberOfPagesPerItems: number[]
      numberOfTotalPages: number
    }> = reader.$.layout$.pipe(
      debounceTime(10, animationFrameScheduler),
      withLatestFrom(reader.pagination$),
      map(() => {
        // @todo trigger change to pagination info (+ memo if number is same)
        const numberOfPagesPerItems = getNumberOfPagesPerItems()

        return {
          numberOfPagesPerItems,
          /**
           * This may be not accurate for reflowable due to dynamic load / unload.
           */
          numberOfTotalPages: numberOfPagesPerItems.reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, 0),
        }
      }),
      distinctUntilChanged(isShallowEqual),
      startWith({
        numberOfPagesPerItems: [],
        numberOfTotalPages: 0,
      })
    )

    const pagination$ = combineLatest([innerPaginationExtendedInfo$, totalPages$]).pipe(
      map(([pageInfo, totalPageInfo]) => ({
        ...pageInfo,
        ...totalPageInfo,
        beginAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
          .slice(0, pageInfo.beginSpineItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, pageInfo.beginPageIndexInChapter ?? 0),
        endAbsolutePageIndex: totalPageInfo.numberOfPagesPerItems
          .slice(0, pageInfo.endSpineItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, pageInfo.endPageIndexInChapter ?? 0),
      })),
      tap((data) => {
        report.log(`pagination`, data)
      }),
      shareReplay(1),
      takeUntil(reader.$.destroy$)
    )

    return {
      ...reader,
      pagination$,
    }
  }

const buildChapterInfoFromSpineItem = (manifest: Manifest, item: Manifest[`spineItems`][number]) => {
  const { href } = item

  return getChapterInfo(href, manifest.nav?.toc ?? [], manifest)
}

/**
 * @important it's important to compare only path vs path and or href vs href since
 * they have not comparable due to possible encoded values
 */
const getChapterInfo = (
  href: string,
  tocItem: NonNullable<Manifest["nav"]>["toc"],
  manifest: Manifest
): ChapterInfo | undefined => {
  const spineItemIndex = manifest.spineItems.findIndex((item) => item.href === href)

  return tocItem.reduce((acc: ChapterInfo | undefined, tocItem) => {
    const indexOfHash = tocItem.href.indexOf(`#`)
    const tocItemPathWithoutAnchor = indexOfHash > 0 ? tocItem.href.substr(0, indexOfHash) : tocItem.href
    const tocItemHrefWithoutFilename = tocItemPathWithoutAnchor.substring(0, tocItemPathWithoutAnchor.lastIndexOf("/"))
    const hrefWithoutFilename = href.substring(0, href.lastIndexOf("/"))

    const hrefIsChapterHref = href.endsWith(tocItemPathWithoutAnchor)
    const hrefIsWithinChapter = hrefWithoutFilename !== "" && hrefWithoutFilename.endsWith(tocItemHrefWithoutFilename)

    /**
     * @important
     * A possible toc item candidate means that the chapter is at least not after the item.
     * It does not mean it's the correct chapter. The algorithm proceed by reducing every item
     * until we find the one that is not. We then return the last found one.
     *
     * This is the most important piece as it's the reason why we can detect all the pages
     * within a chapter.
     *
     * We rely on the order of items to be true. See https://www.w3.org/publishing/epub3/epub-packages.html#sec-nav-toc
     */
    const isPossibleTocItemCandidate = hrefIsChapterHref || hrefIsWithinChapter

    if (isPossibleTocItemCandidate) {
      const spineItemIndexOfPossibleCandidate = manifest.spineItems.findIndex((item) => item.href === tocItem.href)
      const spineItemIsBeforeThisTocItem = spineItemIndex < spineItemIndexOfPossibleCandidate

      if (spineItemIsBeforeThisTocItem) return acc

      return {
        title: tocItem.title,
        path: tocItem.path,
      }
    }

    const subInfo = getChapterInfo(href, tocItem.contents, manifest)

    if (subInfo) {
      return {
        subChapter: subInfo,
        title: tocItem.title,
        path: tocItem.path,
      }
    }

    return acc
  }, undefined)
}
