import { Subject } from "rxjs"
import { Context } from "./context"
import { SpineItem } from "./spineItem"
import { SpineItemManager } from "./spineItemManager"
import { Report } from "./report"

const NAMESPACE = `pagination`

export const createPagination = ({ context }: { context: Context, spineItemManager: SpineItemManager }) => {
  const subject = new Subject<{ event: `change` }>()
  let beginPageIndex: number | undefined
  let beginNumberOfPages = 0
  let beginCfi: string | undefined
  let beginSpineItemIndex: number | undefined
  let endPageIndex: number | undefined
  let endNumberOfPages = 0
  let endCfi: string | undefined
  let endSpineItemIndex: number | undefined
  let numberOfPagesPerItems: number[] = []

  const getSpineItemNumberOfPages = (spineItem: SpineItem) => {
    // pre-paginated always are only one page
    // if (!spineItem.isReflowable) return 1

    const writingMode = spineItem.spineItemFrame.getWritingMode()
    const { width, height } = spineItem.getElementDimensions()

    if (writingMode === `vertical-rl`) {
      return getNumberOfPages(height, context.getPageSize().height)
    }

    return getNumberOfPages(width, context.getPageSize().width)
  }

  const getInfoForUpdate = (info: {
    spineItem: SpineItem,
    // spineItemPosition: { x: number, y: number },
    pageIndex: number,
    cfi: string | undefined,
    options: {
      isAtEndOfChapter?: boolean,
      // cfi?: string
    }
  }) => {
    const numberOfPages = getSpineItemNumberOfPages(info.spineItem)
    // const pageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(info.spineItemPosition, info.spineItem)
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
    //   cfi = spineItemLocator.getCfi(pageIndex, info.spineItem)
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
          .slice(0, beginSpineItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, beginPageIndex ?? 0),
        cfi: beginCfi,
        numberOfPages: beginNumberOfPages,
        spineItemIndex: beginSpineItemIndex
      }
    },
    getEndInfo () {
      return {
        pageIndex: endPageIndex,
        absolutePageIndex: numberOfPagesPerItems
          .slice(0, endSpineItemIndex)
          .reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, endPageIndex ?? 0),
        cfi: endCfi,
        numberOfPages: endNumberOfPages,
        spineItemIndex: endSpineItemIndex
      }
    },
    getTotalNumberOfPages: () => {
      return numberOfPagesPerItems.reduce((acc, numberOfPagesForItem) => acc + numberOfPagesForItem, 0)
    },
    updateTotalNumberOfPages: (spineItems: SpineItem[]) => {
      numberOfPagesPerItems = spineItems.map((item) => {
        return getSpineItemNumberOfPages(item)
      }, 0)

      subject.next({ event: `change` })
    },
    updateBeginAndEnd: Report.measurePerformance(`${NAMESPACE} updateBeginAndEnd`, 1, (
      begin: Parameters<typeof getInfoForUpdate>[0] & {
        spineItemIndex: number,
      },
      end: Parameters<typeof getInfoForUpdate>[0] & {
        spineItemIndex: number,
      }
    ) => {
      const beginInfo = getInfoForUpdate(begin)
      const endInfo = getInfoForUpdate(end)

      beginPageIndex = beginInfo.pageIndex
      beginNumberOfPages = beginInfo.numberOfPages
      beginCfi = beginInfo.cfi
      beginSpineItemIndex = begin.spineItemIndex

      endPageIndex = endInfo.pageIndex
      endNumberOfPages = endInfo.numberOfPages
      endCfi = endInfo.cfi
      endSpineItemIndex = end.spineItemIndex

      Report.log(NAMESPACE, `updateBeginAndEnd`, { begin, end, beginCfi, beginSpineItemIndex, endCfi, endSpineItemIndex })

      subject.next({ event: `change` })
    }, { disable: true }),
    $: subject.asObservable()
  }
}

export type Pagination = ReturnType<typeof createPagination>

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
