import { Subject } from "rxjs"
import { Context } from "./context"
import { ReadingItem } from "./readingItem"
import { ReadingItemManager } from "./readingItemManager"
import { Report } from "./report"

const NAMESPACE = `pagination`

export type Pagination = ReturnType<typeof createPagination>

export const createPagination = ({ context }: { context: Context, readingItemManager: ReadingItemManager }) => {
  const subject = new Subject<{ event: `change` }>()
  let beginPageIndex: number | undefined
  let beginNumberOfPages = 0
  let beginCfi: string | undefined
  let beginReadingItemIndex: number | undefined
  let endPageIndex: number | undefined
  let endNumberOfPages = 0
  let endCfi: string | undefined
  let endReadingItemIndex: number | undefined
  let numberOfPagesPerItems: number[] = []

  const getReadingItemNumberOfPages = (readingItem: ReadingItem) => {
    // pre-paginated always are only one page
    // if (!readingItem.isReflowable) return 1

    const writingMode = readingItem.readingItemFrame.getWritingMode()
    const { width, height } = readingItem.getElementDimensions()

    if (writingMode === `vertical-rl`) {
      return getNumberOfPages(height, context.getPageSize().height)
    }

    return getNumberOfPages(width, context.getPageSize().width)
  }

  const getInfoForUpdate = (info: {
    readingItem: ReadingItem,
    // readingItemPosition: { x: number, y: number },
    pageIndex: number,
    cfi: string | undefined,
    options: {
      isAtEndOfChapter?: boolean,
      // cfi?: string
    }
  }) => {
    const numberOfPages = getReadingItemNumberOfPages(info.readingItem)
    // const pageIndex = readingItemLocator.getReadingItemPageIndexFromPosition(info.readingItemPosition, info.readingItem)
    const cfi: string | undefined = undefined

    // @todo update pagination cfi whenever iframe is ready (cause even offset may not change but we still need to get the iframe for cfi)
    // @todo update cfi also whenever a resize occurs in the iframe
    // - load
    // - font loaded
    // - resize
    // future changes would potentially only be resize (easy to track) and font size family change.
    // to track that we can have a hidden text element and track it and send event back
    // console.warn(typeof info.options.cfi)
    // if (info.options.cfi === undefined) {
    //   cfi = readingItemLocator.getCfi(pageIndex, info.readingItem)
    //   Report.log(`pagination`, `cfi`, pageIndex, cfi)
    // } else {
    //   cfi = info.options.cfi
    // }

    // cfi = info.options.cfi

    return {
      numberOfPages,
      pageIndex: info.pageIndex,
      cfi: info.cfi
    }
  }

  return {
    getBeginInfo () {
      return {
        pageIndex: beginPageIndex,
        absolutePageIndex: numberOfPagesPerItems
          .slice(0, beginReadingItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, beginPageIndex ?? 0),
        cfi: beginCfi,
        numberOfPages: beginNumberOfPages,
        readingItemIndex: beginReadingItemIndex
      }
    },
    getEndInfo () {
      return {
        pageIndex: endPageIndex,
        absolutePageIndex: numberOfPagesPerItems
          .slice(0, endReadingItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, endPageIndex ?? 0),
        cfi: endCfi,
        numberOfPages: endNumberOfPages,
        readingItemIndex: endReadingItemIndex
      }
    },
    getTotalNumberOfPages: () => {
      return numberOfPagesPerItems.reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, 0)
    },
    updateTotalNumberOfPages: (readingItems: ReadingItem[]) => {
      numberOfPagesPerItems = readingItems.map((item) => {
        return getReadingItemNumberOfPages(item)
      }, 0)

      subject.next({ event: `change` })
    },
    updateBeginAndEnd: Report.measurePerformance(`${NAMESPACE} updateBeginAndEnd`, 1, (
      begin: Parameters<typeof getInfoForUpdate>[0] & {
        readingItemIndex: number,
      },
      end: Parameters<typeof getInfoForUpdate>[0] & {
        readingItemIndex: number,
      }
    ) => {
      const beginInfo = getInfoForUpdate(begin)
      const endInfo = getInfoForUpdate(end)

      beginPageIndex = beginInfo.pageIndex
      beginNumberOfPages = beginInfo.numberOfPages
      beginCfi = beginInfo.cfi
      beginReadingItemIndex = begin.readingItemIndex

      endPageIndex = endInfo.pageIndex
      endNumberOfPages = endInfo.numberOfPages
      endCfi = endInfo.cfi
      endReadingItemIndex = end.readingItemIndex

      Report.log(NAMESPACE, `updateBeginAndEnd`, { begin, end, beginCfi, beginReadingItemIndex, endCfi, endReadingItemIndex })

      subject.next({ event: `change` })
    }, { disable: true }),
    $: subject.asObservable()
  }
}

export const getItemOffsetFromPageIndex = (pageWidth: number, pageIndex: number, itemWidth: number) => {
  const lastPageOffset = itemWidth - pageWidth
  const logicalOffset = (itemWidth * (pageIndex * pageWidth)) / itemWidth

  return Math.max(0, Math.min(lastPageOffset, logicalOffset))
}

export const getNumberOfPages = (itemWidth: number, pageWidth: number) => {
  if ((pageWidth || 0) === 0 || (itemWidth || 0) === 0) return 1
  return Math.floor(Math.max(1, itemWidth / pageWidth))
}

export const getClosestValidOffsetFromApproximateOffsetInPages = (offset: number, pageWidth: number, itemWidth: number) => {
  const numberOfPages = getNumberOfPages(itemWidth, pageWidth)
  const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

  if (offset >= (numberOfPages * pageWidth)) return offsetValues[offsetValues.length - 1] || 0

  return offsetValues.find(offsetRange => offset < (offsetRange + pageWidth)) || 0
}
