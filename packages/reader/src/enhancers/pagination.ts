import { animationFrameScheduler, combineLatest, Observable, ObservedValueOf } from "rxjs"
import { map, debounceTime, startWith, shareReplay, distinctUntilChanged, withLatestFrom, takeUntil, tap } from "rxjs/operators"
import { Enhancer } from "./types"
import { SpineItem } from "../spineItem/createSpineItem"
import { Manifest } from "../types"
import { progressionEnhancer } from "./progression"
import { getNumberOfPages } from "../pagination"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"

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
}

export const paginationEnhancer: Enhancer<
  {},
  {
    $: {
      pagination$: Observable<PaginationInfo>
    }
  },
  {},
  {},
  typeof progressionEnhancer
> = (next) => (options) => {
  const reader = next(options)
  const chaptersInfo: { [key: string]: ChapterInfo | undefined } = {}

  const getChapterInfo = (item: Manifest[`spineItems`][number]) => {
    const manifest = reader.context.getManifest()
    return item && manifest && buildChapterInfoFromSpineItem(manifest, item)
  }

  const mapPaginationInfoToExtendedInfo = (paginationInfo: ObservedValueOf<typeof reader[`$`][`pagination$`]>) => {
    const context = reader.context
    const beginItem =
      paginationInfo.beginSpineItemIndex !== undefined ? reader.getSpineItem(paginationInfo.beginSpineItemIndex) : undefined
    const endItem =
      paginationInfo.endSpineItemIndex !== undefined ? reader.getSpineItem(paginationInfo.endSpineItemIndex) : undefined

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
      // spineItemPath: beginItem?.item.path,
      // spineItemId: beginItem?.item.id,
      beginCfi: paginationInfo.beginCfi,
      beginSpineItemReadingDirection: beginItem?.getReadingDirection(),
      endChapterInfo: endItem ? chaptersInfo[endItem.item.id] : undefined,
      endPageIndexInChapter: paginationInfo.endPageIndex,
      endNumberOfPagesInChapter: paginationInfo.endNumberOfPages,
      endSpineItemIndex: paginationInfo.endSpineItemIndex,
      // spineItemPath: endItem?.item.path,
      // spineItemId: endItem?.item.id,
      endSpineItemReadingDirection: endItem?.getReadingDirection(),
      endCfi: paginationInfo.endCfi,
      // end: ReadingLocation;
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
      isUsingSpread: context.shouldDisplaySpread()
      // chaptersOfBook: number;
      // chapter: string;
      // hasNextChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // hasPreviousChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // numberOfSpineItems: context.getManifest()?.readingOrder.length,
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

  reader.$.itemsCreated$
    .pipe(
      tap((items) =>
        items.forEach(({ item }) => {
          chaptersInfo[item.id] = getChapterInfo(item)
        })
      ),
      takeUntil(reader.$.destroy$)
    )
    .subscribe()

  const innerPaginationExtendedInfo$ = reader.$.pagination$.pipe(
    map(mapPaginationInfoToExtendedInfo),
    distinctUntilChanged(isShallowEqual)
  )

  const totalPages$ = reader.$.layout$.pipe(
    debounceTime(10, animationFrameScheduler),
    withLatestFrom(reader.$.pagination$),
    map(() => {
      // @todo trigger change to pagination info (+ memo if number is same)
      const numberOfPagesPerItems = getNumberOfPagesPerItems()

      return {
        numberOfPagesPerItems,
        /**
         * This may be not accurate for reflowable due to dynamic load / unload.
         */
        numberOfTotalPages: numberOfPagesPerItems.reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, 0)
      }
    }),
    distinctUntilChanged(isShallowEqual),
    startWith({
      numberOfPagesPerItems: [] as number[],
      numberOfTotalPages: 0
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
        .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, pageInfo.endPageIndexInChapter ?? 0)
    })),
    tap((data) => {
      report.log(`pagination`, data)
    }),
    shareReplay(1),
    takeUntil(reader.$.destroy$)
  )

  return {
    ...reader,
    $: {
      ...reader.$,
      pagination$
    }
  }
}

export const buildChapterInfoFromSpineItem = (manifest: Manifest, item: Manifest[`spineItems`][number]) => {
  const { href } = item

  return getChapterInfo(href, manifest.nav.toc)
}

const getChapterInfo = (path: string, tocItems: Manifest[`nav`][`toc`]): ChapterInfo | undefined => {
  return tocItems.reduce((acc: ChapterInfo | undefined, tocItem) => {
    const indexOfHash = tocItem.path.indexOf(`#`)
    const tocItemPathWithoutAnchor = indexOfHash > 0 ? tocItem.path.substr(0, indexOfHash) : tocItem.path
    if (path.endsWith(tocItemPathWithoutAnchor)) {
      return {
        title: tocItem.title,
        path: tocItem.path
      }
    }

    const subInfo = getChapterInfo(path, tocItem.contents)

    if (subInfo) {
      return {
        subChapter: subInfo,
        title: tocItem.title,
        path: tocItem.path
      }
    }

    return acc
  }, undefined)
}
