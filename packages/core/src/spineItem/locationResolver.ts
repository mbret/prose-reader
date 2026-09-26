import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { getRangeFromNode, isHtmlElement } from "../utils/dom"
import type { Viewport } from "../viewport/Viewport"
import {
  getClosestValidOffsetFromApproximateOffsetInPages,
  getItemOffsetFromPageIndex,
} from "./helpers"
import { getSpineItemPageIndexFromSpineItemPosition } from "./layout/getSpineItemPageIndexFromSpineItemPosition"
import { getSpineItemPositionFromPageIndex } from "./layout/getSpineItemPositionFromPageIndex"
import type { SpineItem } from "./SpineItem"
import { SpineItemPosition, UnboundSpineItemPagePosition } from "./types"

export type SpineItemLocator = ReturnType<typeof createSpineItemLocator>

export const createSpineItemLocator = ({
  context,
  settings,
  viewport,
}: {
  context: Context
  settings: ReaderSettingsManager
  viewport: Viewport
}) => {
  /**
   * The box a node is laid out in, from `offset` when it is text, or
   * `undefined` when it lays out none, as when it is hidden. A range over the
   * node's contents from `offset` measures it, unless it selects nothing that
   * lays out a box, as in an image, which has no contents, or a video, whose
   * sources lay out none: the element's own box does then.
   *
   * Not for the boundary after an element's last child, where that range is
   * collapsed: the element's box starts where its contents do, pages before
   * the boundary when the element spans several.
   */
  const getLaidOutRect = (node: Node, offset: number) => {
    const range = getRangeFromNode(node, offset)

    if (range && range.getClientRects().length > 0)
      return range.getBoundingClientRect()

    const isBoundaryAfterContents = !!range?.collapsed && node.hasChildNodes()

    if (
      !isBoundaryAfterContents &&
      isHtmlElement(node) &&
      node.getClientRects().length > 0
    )
      return node.getBoundingClientRect()

    return undefined
  }

  const getSpineItemPositionFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    // A node at the item's left edge is at 0, which is a place like any other.
    const offsetOfNodeInSpineItem = getLaidOutRect(node, offset)?.x

    const spineItemWidth = spineItem.layoutInfo?.width || 0
    const pageWidth = viewport.pageSize.width

    if (offsetOfNodeInSpineItem !== undefined) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(
        offsetOfNodeInSpineItem,
        pageWidth,
        spineItemWidth,
      )

      // @todo vertical
      return new SpineItemPosition({ x: val, y: 0 })
    }

    return undefined
  }

  const getSpineItemClosestPositionFromUnsafePosition = (
    unsafePosition: SpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.layoutInfo

    const adjustedPosition = new SpineItemPosition({
      x: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.x,
        viewport.pageSize.width,
        width,
      ),
      y: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.y,
        viewport.pageSize.height,
        height,
      ),
    })

    return adjustedPosition
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const position = getSpineItemPositionFromNode(node, offset, spineItem)
    const { height, width } = spineItem.layoutInfo

    return position
      ? getSpineItemPageIndexFromSpineItemPosition({
          isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
          position,
          itemHeight: height,
          itemWidth: width,
          isRTL: context.isRTL(),
          pageWidth: viewport.pageSize.width,
          pageHeight: viewport.pageSize.height,
          pageTurnDirection: settings.values.computedPageTurnDirection,
          pageTurnMode: settings.values.pageTurnMode,
        })
      : undefined
  }

  const getSpineItemPagePositionFromSpineItemPosition = (
    position: SpineItemPosition,
    pageIndex: number,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.layoutInfo
    const pageWidth = viewport.pageSize.width
    const pageHeight = viewport.pageSize.height
    const isUsingVerticalWriting = !!spineItem.isUsingVerticalWriting()

    if (isUsingVerticalWriting) {
      // For vertical writing, pages stack vertically
      const pageStartY = getItemOffsetFromPageIndex(
        pageHeight,
        pageIndex,
        height,
      )
      return new UnboundSpineItemPagePosition({
        x: position.x,
        y: position.y - pageStartY,
      })
    }

    // For horizontal writing
    const pageStartX = getItemOffsetFromPageIndex(pageWidth, pageIndex, width)

    if (context.isRTL()) {
      // For RTL, pages are positioned from right to left
      const rtlPageStartX = width - (pageIndex + 1) * pageWidth
      return new UnboundSpineItemPagePosition({
        x: position.x - Math.max(0, rtlPageStartX),
        y: position.y,
      })
    }

    // For LTR, simply subtract the page start position from the absolute position
    return new UnboundSpineItemPagePosition({
      x: position.x - pageStartX,
      y: position.y,
    })
  }

  return {
    getSpineItemPositionFromNode,
    getSpineItemPositionFromPageIndex: ({
      pageIndex,
      spineItem,
    }: {
      pageIndex: number
      spineItem: SpineItem
    }) =>
      getSpineItemPositionFromPageIndex({
        context,
        isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
        itemLayout: spineItem.layoutInfo,
        pageIndex,
        viewport,
      }),
    getSpineItemPageIndexFromPosition: (params: {
      position: SpineItemPosition
      isUsingVerticalWriting: boolean
      itemWidth: number
      itemHeight: number
    }) =>
      getSpineItemPageIndexFromSpineItemPosition({
        ...params,
        isRTL: context.isRTL(),
        pageWidth: viewport.pageSize.width,
        pageHeight: viewport.pageSize.height,
        pageTurnDirection: settings.values.computedPageTurnDirection,
        pageTurnMode: settings.values.pageTurnMode,
      }),
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getSpineItemPagePositionFromSpineItemPosition,
  }
}
