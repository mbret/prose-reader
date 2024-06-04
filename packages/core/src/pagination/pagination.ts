import { BehaviorSubject, distinctUntilChanged, filter } from "rxjs"
import { Context } from "../context/context"
import { SpineItem } from "../spineItem/createSpineItem"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { PaginationInfo } from "./types"

const NAMESPACE = `pagination`

export const createPagination = ({ context }: { context: Context; spineItemManager: SpineItemManager }) => {
  const paginationSubject$ = new BehaviorSubject<PaginationInfo>({
    beginPageIndexInSpineItem: undefined,
    beginNumberOfPagesInSpineItem: 0,
    beginCfi: undefined,
    beginSpineItemIndex: undefined,
    endPageIndexInSpineItem: undefined,
    endNumberOfPagesInSpineItem: 0,
    endCfi: undefined,
    endSpineItemIndex: undefined,
  })

  const getSpineItemNumberOfPages = (spineItem: SpineItem) => {
    // pre-paginated always are only one page
    // if (!spineItem.isReflowable) return 1

    const writingMode = spineItem.spineItemFrame.getWritingMode()
    const { width, height } = spineItem.getElementDimensions()

    if (writingMode === `vertical-rl`) {
      return calculateNumberOfPagesForItem(height, context.getPageSize().height)
    }

    return calculateNumberOfPagesForItem(width, context.getPageSize().width)
  }

  const getInfoForUpdate = (info: {
    spineItem: SpineItem
    // spineItemPosition: { x: number, y: number },
    pageIndex: number
    cfi: string | undefined
    options: {
      isAtEndOfChapter?: boolean
      // cfi?: string
    }
  }) => {
    const numberOfPages = getSpineItemNumberOfPages(info.spineItem)
    // const pageIndex = spineItemLocator.getSpineItemPageIndexFromPosition(info.spineItemPosition, info.spineItem)
    // const cfi: string | undefined = undefined

    // @todo update pagination cfi whenever iframe is ready (cause even offset may not change but we still need to get the iframe for cfi)
    // @todo update cfi also whenever a resize occurs in the iframe
    // - load
    // - font loaded
    // - resize
    // future changes would potentially only be resize (easy to track) and font size family change.
    // to track that we can have a hidden text element and track it and send event back
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
      cfi: info.cfi,
    }
  }

  const updateBeginAndEnd = Report.measurePerformance(
    `${NAMESPACE} updateBeginAndEnd`,
    1,
    (
      begin: Parameters<typeof getInfoForUpdate>[0] & {
        spineItemIndex: number
      },
      end: Parameters<typeof getInfoForUpdate>[0] & {
        spineItemIndex: number
      },
    ) => {
      const beginInfo = getInfoForUpdate(begin)
      const endInfo = getInfoForUpdate(end)

      const newValues: PaginationInfo = {
        beginPageIndexInSpineItem: beginInfo.pageIndex,
        beginNumberOfPagesInSpineItem: beginInfo.numberOfPages,
        beginCfi: beginInfo.cfi,
        beginSpineItemIndex: begin.spineItemIndex,
        endPageIndexInSpineItem: endInfo.pageIndex,
        endNumberOfPagesInSpineItem: endInfo.numberOfPages,
        endCfi: endInfo.cfi,
        endSpineItemIndex: end.spineItemIndex,
      }

      paginationSubject$.next({
        ...paginationSubject$.value,
        ...newValues,
      })
    },
    { disable: true },
  )

  const getPaginationInfo = () => paginationSubject$.value

  /**
   * We start emitting pagination information as soon as there is a valid pagination
   */
  const paginationInfo$ = paginationSubject$.pipe(
    distinctUntilChanged(isShallowEqual),
    filter(({ beginPageIndexInSpineItem }) => beginPageIndexInSpineItem !== undefined),
  )

  const destroy = () => {
    paginationSubject$.complete()
  }

  return {
    destroy,
    updateBeginAndEnd,
    getPaginationInfo,
    paginationInfo$,
  }
}

export type Pagination = ReturnType<typeof createPagination>

export const getItemOffsetFromPageIndex = (pageWidth: number, pageIndex: number, itemWidth: number) => {
  const lastPageOffset = itemWidth - pageWidth
  const logicalOffset = (itemWidth * (pageIndex * pageWidth)) / itemWidth

  return Math.max(0, Math.min(lastPageOffset, logicalOffset))
}

export const calculateNumberOfPagesForItem = (itemWidth: number, pageWidth: number) => {
  if ((pageWidth || 0) === 0 || (itemWidth || 0) === 0) return 1
  return Math.floor(Math.max(1, itemWidth / pageWidth))
}

export const getClosestValidOffsetFromApproximateOffsetInPages = (offset: number, pageWidth: number, itemWidth: number) => {
  const numberOfPages = calculateNumberOfPagesForItem(itemWidth, pageWidth)
  const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

  if (offset >= numberOfPages * pageWidth) return offsetValues[offsetValues.length - 1] || 0

  return offsetValues.find((offsetRange) => offset < offsetRange + pageWidth) || 0
}
