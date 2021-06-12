import { Enhancer } from "../createReader";
import { ChapterInfo, getPercentageEstimate } from "../navigation";

export const paginationEnhancer: Enhancer<{
  getPaginationInfo: () => undefined | {
    begin: {
      chapterInfo: undefined | {
        title: string
        subChapter?: ChapterInfo,
        path: string
      },
      pageIndexInChapter: number | undefined,
      absolutePageIndex: number | undefined,
      numberOfPagesInChapter: number | undefined,
      readingItemIndex: number | undefined,
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
      readingItemIndex: number | undefined,
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
    // numberOfSpineItems: number | undefined
  }
}> = (next) => (options) => {
  const reader = next(options)

  return {
    ...reader,
    getPaginationInfo: () => {
      const pagination = reader.pagination
      const context = reader.context
      const paginationBegin = reader.pagination.getBeginInfo()
      const paginationEnd = reader.pagination.getEndInfo()
      const beginItem = paginationBegin.readingItemIndex !== undefined ? reader.getReadingItem(paginationBegin.readingItemIndex) : undefined
      const endItem = paginationEnd.readingItemIndex !== undefined ? reader.getReadingItem(paginationEnd.readingItemIndex) : undefined

      if (!pagination || !context) return undefined

      return {
        begin: {
          chapterInfo: reader.getChapterInfo(),
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
          readingItemIndex: paginationBegin.readingItemIndex,
          spineItemPath: beginItem?.item.path,
          spineItemId: beginItem?.item.id,
          cfi: paginationBegin.cfi,
          spineItemReadingDirection: beginItem?.getReadingDirection(),
        },
        end: {
          chapterInfo: reader.getChapterInfo(),
          pageIndexInChapter: paginationEnd.pageIndex,
          absolutePageIndex: paginationEnd.absolutePageIndex,
          numberOfPagesInChapter: paginationEnd.numberOfPages,
          readingItemIndex: paginationEnd.readingItemIndex,
          spineItemPath: endItem?.item.path,
          spineItemId: endItem?.item.id,
          spineItemReadingDirection: endItem?.getReadingDirection(),
          cfi: paginationEnd.cfi,
        },
        // end: ReadingLocation;
        // spineItemReadingDirection: focusedReadingItem?.getReadingDirection(),
        /**
         * This percentage is based of the weight (kb) of every items and the number of pages.
         * It is not accurate but gives a general good idea of the overall progress.
         * It is recommended to use this progress only for reflow books. For pre-paginated books
         * the number of pages and current index can be used instead since 1 page = 1 chapter. 
         */
        percentageEstimateOfBook: getPercentageEstimate(context, paginationEnd.readingItemIndex ?? 0, paginationEnd.numberOfPages, paginationEnd.pageIndex || 0),
        numberOfTotalPages: pagination.getTotalNumberOfPages(),
        // chaptersOfBook: number;
        // chapter: string;
        // hasNextChapter: (reader.readingOrderView.readingItemIndex || 0) < (manifest.readingOrder.length - 1),
        // hasPreviousChapter: (reader.readingOrderView.readingItemIndex || 0) < (manifest.readingOrder.length - 1),
        // numberOfSpineItems: context.getManifest()?.readingOrder.length,
      }
    }
  }
}