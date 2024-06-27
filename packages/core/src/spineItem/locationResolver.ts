import { Context } from "../context/Context"
import {
  getItemOffsetFromPageIndex,
  getClosestValidOffsetFromApproximateOffsetInPages,
  calculateNumberOfPagesForItem,
} from "../pagination/pagination"
import { SpineItem } from "./createSpineItem"
import { getFirstVisibleNodeForViewport, getRangeFromNode } from "../utils/dom"
import { SpineItemPosition, UnsafeSpineItemPosition } from "./types"

export const createLocationResolver = ({ context }: { context: Context }) => {
  const getSafePosition = (
    unsafeSpineItemPosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ): SpineItemPosition => ({
    x: Math.min(spineItem.getElementDimensions().width, Math.max(0, unsafeSpineItemPosition.x)),
    y: Math.min(spineItem.getElementDimensions().height, Math.max(0, unsafeSpineItemPosition.y)),
  })

  const getSpineItemPositionFromPageIndex = (pageIndex: number, spineItem: SpineItem): SpineItemPosition => {
    const { width: itemWidth, height: itemHeight } = spineItem.getElementDimensions()

    if (spineItem.isUsingVerticalWriting()) {
      const ltrRelativeOffset = getItemOffsetFromPageIndex(context.getPageSize().height, pageIndex, itemHeight)

      return {
        x: 0,
        y: ltrRelativeOffset,
      }
    }

    const ltrRelativeOffset = getItemOffsetFromPageIndex(context.getPageSize().width, pageIndex, itemWidth)

    if (context.isRTL()) {
      return {
        x: itemWidth - ltrRelativeOffset - context.getPageSize().width,
        y: 0,
      }
    }

    return {
      x: ltrRelativeOffset,
      y: 0,
    }
  }

  /**
   * @important
   * This calculation takes blank page into account, the iframe could be only one page but with a blank page
   * positioned before. Resulting on two page index possible values (0 & 1).
   */
  const getSpineItemPageIndexFromPosition = (position: UnsafeSpineItemPosition, spineItem: SpineItem) => {
    const { width: itemWidth, height: itemHeight } = spineItem.getElementDimensions()
    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height

    const safePosition = getSafePosition(position, spineItem)

    const offset = context.isRTL() ? itemWidth - safePosition.x - context.getPageSize().width : safePosition.x

    if (spineItem.isUsingVerticalWriting()) {
      const numberOfPages = calculateNumberOfPagesForItem(itemHeight, pageHeight)

      return getPageFromOffset(position.y, pageHeight, numberOfPages)
    } else {
      const numberOfPages = calculateNumberOfPagesForItem(itemWidth, pageWidth)
      const pageIndex = getPageFromOffset(offset, pageWidth, numberOfPages)

      return pageIndex
    }
  }

  const getSpineItemOffsetFromAnchor = (anchor: string, spineItem: SpineItem) => {
    const itemWidth = spineItem.getElementDimensions()?.width || 0
    const pageWidth = context.getPageSize().width
    const anchorElementBoundingRect = spineItem.getBoundingRectOfElementFromSelector(anchor)

    const offsetOfAnchor = anchorElementBoundingRect?.x || 0

    return getClosestValidOffsetFromApproximateOffsetInPages(offsetOfAnchor, pageWidth, itemWidth)
  }

  const getSpineItemPositionFromNode = (node: Node, offset: number, spineItem: SpineItem) => {
    let offsetOfNodeInSpineItem: number | undefined

    // for some reason `img` does not work with range (x always = 0)
    if (node?.nodeName === `img` || (node?.textContent === `` && node.nodeType === Node.ELEMENT_NODE)) {
      offsetOfNodeInSpineItem = (node as HTMLElement).getBoundingClientRect().x
    } else if (node) {
      const range = node ? getRangeFromNode(node, offset) : undefined
      offsetOfNodeInSpineItem = range?.getBoundingClientRect().x || offsetOfNodeInSpineItem
    }

    const spineItemWidth = spineItem.getElementDimensions()?.width || 0
    const pageWidth = context.getPageSize().width

    if (offsetOfNodeInSpineItem) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(offsetOfNodeInSpineItem, pageWidth, spineItemWidth)

      // @todo vertical
      return { x: val, y: 0 }
    }

    return undefined
  }

  /**
   * @todo handle vertical
   */
  const getFirstNodeOrRangeAtPage = (pageIndex: number, spineItem: SpineItem) => {
    const pageSize = context.getPageSize()
    const frame = spineItem.spineItemFrame?.getManipulableFrame()?.frame

    if (
      frame?.contentWindow?.document &&
      // very important because it is being used by next functions
      frame.contentWindow.document.body !== null
    ) {
      // @todo handle vertical jp
      // top seems ok but left is not, it should probably not be 0 or something
      const { x: left, y: top } = getSpineItemPositionFromPageIndex(pageIndex, spineItem)
      const viewport = {
        left,
        right: left + pageSize.width,
        top,
        bottom: top + pageSize.height,
      }

      const res = getFirstVisibleNodeForViewport(frame.contentWindow.document, viewport)

      return res
    }

    return undefined
  }

  const getSpineItemClosestPositionFromUnsafePosition = (
    unsafePosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.getElementDimensions()

    const adjustedPosition = {
      x: getClosestValidOffsetFromApproximateOffsetInPages(unsafePosition.x, context.getPageSize().width, width),
      y: getClosestValidOffsetFromApproximateOffsetInPages(unsafePosition.y, context.getPageSize().height, height),
    }

    return adjustedPosition
  }

  const getSpineItemPageIndexFromNode = (node: Node, offset: number, spineItem: SpineItem) => {
    const position = getSpineItemPositionFromNode(node, offset, spineItem)

    return position ? getSpineItemPageIndexFromPosition(position, spineItem) : undefined
  }

  const getPageFromOffset = (offset: number, pageWidth: number, numberOfPages: number) => {
    const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

    if (offset <= 0) return 0

    if (offset >= numberOfPages * pageWidth) return numberOfPages - 1

    return Math.max(
      0,
      offsetValues.findIndex((offsetRange) => offset < offsetRange + pageWidth),
    )
  }

  return {
    getSpineItemPositionFromNode,
    getSpineItemPositionFromPageIndex,
    getSpineItemOffsetFromAnchor,
    getSpineItemPageIndexFromPosition,
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getFirstNodeOrRangeAtPage,
  }
}
