import { BehaviorSubject, distinctUntilChanged, filter } from "rxjs"
import { Context } from "../context/Context"
import { SpineItem } from "../spineItem/createSpineItem"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { isShallowEqual } from "../utils/objects"
import { PaginationInfo } from "./types"
import { createLocationResolver } from "../spineItem/locationResolver"

const NAMESPACE = `pagination`

export class Pagination {
  protected paginationSubject$ = new BehaviorSubject<PaginationInfo>({
    beginPageIndexInSpineItem: undefined,
    beginNumberOfPagesInSpineItem: 0,
    beginCfi: undefined,
    beginSpineItemIndex: undefined,
    endPageIndexInSpineItem: undefined,
    endNumberOfPagesInSpineItem: 0,
    endCfi: undefined,
    endSpineItemIndex: undefined,
  })

  /**
   * We start emitting pagination information as soon as there is a valid pagination
   */
  public paginationInfo$ = this.paginationSubject$.pipe(
    distinctUntilChanged(isShallowEqual),
    filter(
      ({ beginPageIndexInSpineItem }) =>
        beginPageIndexInSpineItem !== undefined,
    ),
  )

  constructor(
    protected context: Context,
    protected spineITemManager: SpineItemManager,
    protected spineItemlocationResolve: ReturnType<
      typeof createLocationResolver
    >,
  ) {}

  getInfoForUpdate(info: {
    spineItem: SpineItem
    // spineItemPosition: { x: number, y: number },
    pageIndex: number
    cfi: string | undefined
  }) {
    const numberOfPages =
      this.spineItemlocationResolve.getSpineItemNumberOfPages({
        spineItem: info.spineItem,
      })
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

  public updateBeginAndEnd = Report.measurePerformance(
    `${NAMESPACE} updateBeginAndEnd`,
    1,
    (
      begin: Parameters<typeof this.getInfoForUpdate>[0] & {
        spineItemIndex: number
      },
      end: Parameters<typeof this.getInfoForUpdate>[0] & {
        spineItemIndex: number
      },
    ) => {
      const beginInfo = this.getInfoForUpdate(begin)
      const endInfo = this.getInfoForUpdate(end)

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

      this.paginationSubject$.next({
        ...this.paginationSubject$.value,
        ...newValues,
      })
    },
    { disable: true },
  )

  getPaginationInfo() {
    return this.paginationSubject$.value
  }

  destroy() {
    this.paginationSubject$.complete()
  }
}

export const getItemOffsetFromPageIndex = (
  pageWidth: number,
  pageIndex: number,
  itemWidth: number,
) => {
  const lastPageOffset = itemWidth - pageWidth
  const logicalOffset = (itemWidth * (pageIndex * pageWidth)) / itemWidth

  return Math.max(0, Math.min(lastPageOffset, logicalOffset))
}

export const calculateNumberOfPagesForItem = (
  itemWidth: number,
  pageWidth: number,
) => {
  if ((pageWidth || 0) === 0 || (itemWidth || 0) === 0) return 1
  return Math.floor(Math.max(1, itemWidth / pageWidth))
}

export const getClosestValidOffsetFromApproximateOffsetInPages = (
  offset: number,
  pageWidth: number,
  itemWidth: number,
) => {
  const numberOfPages = calculateNumberOfPagesForItem(itemWidth, pageWidth)
  const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

  if (offset >= numberOfPages * pageWidth)
    return offsetValues[offsetValues.length - 1] || 0

  return (
    offsetValues.find((offsetRange) => offset < offsetRange + pageWidth) || 0
  )
}
