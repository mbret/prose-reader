import { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { Enhancer } from "./types"
import { SpineItem } from "../spineItem"
import { Manifest } from "../types"
import { progressionEnhancer } from "./progression"

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
      },
      path: string
    },
    path: string
  },
  path: string
}

type PaginationInfo = undefined | {
  begin: {
    chapterInfo: undefined | {
      title: string
      subChapter?: ChapterInfo,
      path: string
    },
    pageIndexInChapter: number | undefined,
    absolutePageIndex: number | undefined,
    numberOfPagesInChapter: number | undefined,
    spineItemIndex: number | undefined,
    cfi: string | undefined,
    spineItemReadingDirection: `rtl` | `ltr` | undefined,
  },
  end: {
    chapterInfo: undefined | {
      title: string
      subChapter?: ChapterInfo,
      path: string
    },
    pageIndexInChapter: number | undefined,
    absolutePageIndex: number | undefined,
    numberOfPagesInChapter: number | undefined,
    spineItemIndex: number | undefined,
    cfi: string | undefined,
    spineItemReadingDirection: `rtl` | `ltr` | undefined,
  },
  percentageEstimateOfBook: number | undefined,
  /**
   * @warning
   * This value is only correct for pre-paginated books and or
   * if you preload the entire book in case of reflow. This is because
   * items get loaded unloaded when navigating through the book, meaning
   * we cannot measure the number of pages accurately.
   */
  numberOfTotalPages: number | undefined,
  isUsingSpread: boolean,
  // numberOfSpineItems: number | undefined
}

export const paginationEnhancer: Enhancer<{}, {
  pagination: {
    $: Observable<PaginationInfo>,
    getInfo: () => PaginationInfo
  }
}, {}, {}, typeof progressionEnhancer> = (next) => (options) => {
  const reader = next(options)

  const getChapterInfo = () => {
    const item = reader.getSpineItem(reader.getFocusedSpineItemIndex() || 0)
    const manifest = reader.context.getManifest()
    return item && manifest && buildChapterInfoFromSpineItem(manifest, item)
  }

  const getPaginationInfo = (): PaginationInfo => {
    const pagination = reader.innerPagination
    const context = reader.context
    const paginationBegin = reader.innerPagination.getBeginInfo()
    const paginationEnd = reader.innerPagination.getEndInfo()
    const beginItem = paginationBegin.spineItemIndex !== undefined ? reader.getSpineItem(paginationBegin.spineItemIndex) : undefined
    const endItem = paginationEnd.spineItemIndex !== undefined ? reader.getSpineItem(paginationEnd.spineItemIndex) : undefined

    if (!pagination || !context) return undefined

    return {
      begin: {
        chapterInfo: getChapterInfo(),
        pageIndexInChapter: paginationBegin.pageIndex,
        absolutePageIndex: paginationBegin.absolutePageIndex,
        numberOfPagesInChapter: paginationBegin.numberOfPages,
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
        spineItemIndex: paginationBegin.spineItemIndex,
        // spineItemPath: beginItem?.item.path,
        // spineItemId: beginItem?.item.id,
        cfi: paginationBegin.cfi,
        spineItemReadingDirection: beginItem?.getReadingDirection()
      },
      end: {
        chapterInfo: getChapterInfo(),
        pageIndexInChapter: paginationEnd.pageIndex,
        absolutePageIndex: paginationEnd.absolutePageIndex,
        numberOfPagesInChapter: paginationEnd.numberOfPages,
        spineItemIndex: paginationEnd.spineItemIndex,
        // spineItemPath: endItem?.item.path,
        // spineItemId: endItem?.item.id,
        spineItemReadingDirection: endItem?.getReadingDirection(),
        cfi: paginationEnd.cfi
      },
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
          paginationEnd.spineItemIndex ?? 0,
          paginationEnd.numberOfPages,
          paginationEnd.pageIndex || 0,
          reader.getCurrentViewportPosition(),
          endItem
        )
        : 0,
      /**
       * This may be not accurate for reflowable due to dynamic load / unload.
       */
      numberOfTotalPages: pagination.getTotalNumberOfPages(),
      isUsingSpread: context.shouldDisplaySpread()
      // chaptersOfBook: number;
      // chapter: string;
      // hasNextChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // hasPreviousChapter: (reader.spine.spineItemIndex || 0) < (manifest.readingOrder.length - 1),
      // numberOfSpineItems: context.getManifest()?.readingOrder.length,
    }
  }

  return {
    ...reader,
    pagination: {
      $: reader.innerPagination.$
        .pipe(
          map(() => getPaginationInfo())
        ),
      getInfo: getPaginationInfo
    }
  }
}

export const buildChapterInfoFromSpineItem = (manifest: Manifest, spineItem: SpineItem) => {
  const { path } = spineItem.item

  return getChapterInfo(path, manifest.nav.toc)
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
