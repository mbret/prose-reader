import { Context } from "../context"
import { getItemOffsetFromPageIndex, getClosestValidOffsetFromApproximateOffsetInPages, getNumberOfPages } from "../pagination"
import { ReadingItem } from "."
import { getFirstVisibleNodeForViewport, getRangeFromNode } from "../utils/dom"

type ReadingItemPosition = { x: number, y: number }

export const createLocationResolver = ({ context }: {
  context: Context,
}) => {
  const getReadingItemPositionFromPageIndex = (pageIndex: number, readingItem: ReadingItem): ReadingItemPosition => {
    const { width: itemWidth, height: itemHeight } = readingItem.getElementDimensions()
    const itemReadingDirection = readingItem.getReadingDirection()

    if (readingItem.isUsingVerticalWriting()) {
      const ltrRelativeOffset = getItemOffsetFromPageIndex(context.getPageSize().height, pageIndex, itemHeight)

      return {
        x: 0,
        y: ltrRelativeOffset
      }
    }

    const ltrRelativeOffset = getItemOffsetFromPageIndex(context.getPageSize().width, pageIndex, itemWidth)

    if (itemReadingDirection === `rtl`) {
      return {
        x: (itemWidth - ltrRelativeOffset) - context.getPageSize().width,
        y: 0
      }
    }

    return {
      x: ltrRelativeOffset,
      y: 0
    }
  }

  /**
   * @important
   * This calculation takes blank page into account, the iframe could be only one page but with a blank page
   * positioned before. Resulting on two page index possible values (0 & 1).
   */
  const getReadingItemPageIndexFromPosition = (position: ReadingItemPosition, readingItem: ReadingItem) => {
    const { width: itemWidth, height: itemHeight } = readingItem.getElementDimensions()
    const itemReadingDirection = readingItem.getReadingDirection()
    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height

    let offsetNormalizedForLtr = Math.min(itemWidth, Math.max(0, position.x))

    if (itemReadingDirection === `rtl`) {
      offsetNormalizedForLtr = (itemWidth - offsetNormalizedForLtr) - context.getPageSize().width
    }

    if (readingItem.isUsingVerticalWriting()) {
      const numberOfPages = getNumberOfPages(itemHeight, pageHeight)

      return getPageFromOffset(position.y, pageHeight, numberOfPages)
    } else {
      const numberOfPages = getNumberOfPages(itemWidth, pageWidth)
      const pageIndex = getPageFromOffset(offsetNormalizedForLtr, pageWidth, numberOfPages)

      return pageIndex
    }
  }

  const getReadingItemOffsetFromAnchor = (anchor: string, readingItem: ReadingItem) => {
    const itemWidth = (readingItem.getElementDimensions()?.width || 0)
    const pageWidth = context.getPageSize().width
    const anchorElementBoundingRect = readingItem.getBoundingRectOfElementFromSelector(anchor)

    const offsetOfAnchor = anchorElementBoundingRect?.x || 0

    return getClosestValidOffsetFromApproximateOffsetInPages(offsetOfAnchor, pageWidth, itemWidth)
  }

  const getReadingItemPositionFromNode = (node: Node, offset: number, readingItem: ReadingItem) => {
    let offsetOfNodeInReadingItem: number | undefined

    // for some reason `img` does not work with range (x always = 0)
    if (node?.nodeName === `img` || node?.textContent === `` && node.nodeType === Node.ELEMENT_NODE) {
      offsetOfNodeInReadingItem = (node as HTMLElement).getBoundingClientRect().x
    } else if (node) {
      const range = node ? getRangeFromNode(node, offset) : undefined
      offsetOfNodeInReadingItem = range?.getBoundingClientRect().x || offsetOfNodeInReadingItem
    }

    const readingItemWidth = readingItem.getElementDimensions()?.width || 0
    const pageWidth = context.getPageSize().width

    if (offsetOfNodeInReadingItem) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(offsetOfNodeInReadingItem, pageWidth, readingItemWidth)

      // @todo vertical
      return { x: val, y: 0 }
    }

    return undefined
  }

  /**
   * @todo handle vertical
   */
  const getFirstNodeOrRangeAtPage = (pageIndex: number, readingItem: ReadingItem) => {
    const pageSize = context.getPageSize()
    const frame = readingItem.readingItemFrame?.getManipulableFrame()?.frame

    if (
      frame?.contentWindow?.document &&
      // very important because it is being used by next functions
      frame.contentWindow.document.body !== null
    ) {
      // @todo handle vertical jp
      // top seems ok but left is not, it should probably not be 0 or something
      const { x: left, y: top } = getReadingItemPositionFromPageIndex(pageIndex, readingItem)
      const viewport = {
        left,
        right: left + pageSize.width,
        top,
        bottom: top + pageSize.height
      }

      const res = getFirstVisibleNodeForViewport(frame.contentWindow.document, viewport)

      return res
    }

    return undefined
  }

  const getReadingItemClosestPositionFromUnsafePosition = (unsafePosition: ReadingItemPosition, readingItem: ReadingItem) => {
    const { width, height } = readingItem.getElementDimensions()

    const adjustedPosition = {
      x: getClosestValidOffsetFromApproximateOffsetInPages(unsafePosition.x, context.getPageSize().width, width),
      y: getClosestValidOffsetFromApproximateOffsetInPages(unsafePosition.y, context.getPageSize().height, height)
    }

    return adjustedPosition
  }

  const getReadingItemPageIndexFromNode = (node: Node, offset: number, readingItem: ReadingItem) => {
    const position = getReadingItemPositionFromNode(node, offset, readingItem)

    return position ? getReadingItemPageIndexFromPosition(position, readingItem) : undefined
  }

  const getPageFromOffset = (offset: number, pageWidth: number, numberOfPages: number) => {
    const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

    if (offset <= 0) return 0

    if (offset >= (numberOfPages * pageWidth)) return numberOfPages - 1

    return Math.max(0, offsetValues.findIndex(offsetRange => offset < (offsetRange + pageWidth)))
  }

  return {
    getReadingItemPositionFromNode,
    getReadingItemPositionFromPageIndex,
    getReadingItemOffsetFromAnchor,
    getReadingItemPageIndexFromPosition,
    getReadingItemPageIndexFromNode,
    getReadingItemClosestPositionFromUnsafePosition,
    getFirstNodeOrRangeAtPage
  }
}
