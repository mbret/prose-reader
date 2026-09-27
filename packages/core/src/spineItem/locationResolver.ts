import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  getNextNodeInDocumentOrder,
  getRangeFromNode,
  isHtmlElement,
} from "../utils/dom"
import type { Viewport } from "../viewport/Viewport"
import {
  getClosestValidOffsetFromApproximateOffsetInPages,
  getItemOffsetFromPageIndex,
} from "./helpers"
import { getSpineItemPageIndexFromSpineItemPosition } from "./layout/getSpineItemPageIndexFromSpineItemPosition"
import { getSpineItemPositionFromPageIndex } from "./layout/getSpineItemPositionFromPageIndex"
import { isLaidOutAsOneColumn } from "./layout/isLaidOutAsOneColumn"
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
   * The rect a node covers, from `offset` on, or `undefined` when it isn't
   * rendered: `display: none`, or inside it.
   *
   * Its rect alone cannot tell the two apart. A node that isn't rendered
   * measures an empty rect at `x === 0`, the same `x` as rendered text at the
   * item's left edge, such as a page's first line without a horizontal margin.
   * Only a rendered node has client rects, whatever their size: an element
   * without one still has its box, a collapsed range in text its line's.
   */
  const getRenderedRectOfNode = (node: Node, offset: number) => {
    const range = getRangeFromNode(node, offset)

    /**
     * The boundary after an element's last child, where the range is
     * collapsed, is where the element's contents end.
     */
    if (range?.collapsed && node.hasChildNodes())
      return getRenderedEndOfContents(node)

    if (range?.getClientRects().length) return range.getBoundingClientRect()

    /**
     * A range that selects no box in an element rendered all the same, such
     * as an `img`, which has no contents, or a `video`, whose sources lay out
     * none: the element is measured as a whole.
     */
    return isHtmlElement(node) && node.getClientRects().length
      ? node.getBoundingClientRect()
      : undefined
  }

  /**
   * The last box a node's contents lay out, or, when they lay out none, as a
   * `video`'s sources, the last of its own: where its contents end, pages
   * after where it starts when it spans several.
   */
  const getRenderedEndOfContents = (node: Node) => {
    const contents = node.ownerDocument?.createRange()

    contents?.selectNodeContents(node)

    const getLastBox = (boxes: DOMRectList | undefined) =>
      boxes?.item(boxes.length - 1) ?? undefined

    return (
      getLastBox(contents?.getClientRects()) ??
      (isHtmlElement(node) ? getLastBox(node.getClientRects()) : undefined)
    )
  }

  /**
   * The rect of the first content rendered after a node and outside it, in
   * document order: the first text or childless element, such as an `img`,
   * that has a box.
   */
  const getRenderedRectAfterNode = (node: Node) => {
    let candidate = getNextNodeInDocumentOrder(node, { skipDescendants: true })

    while (candidate) {
      const isTextOrChildlessElement =
        candidate.nodeType === Node.TEXT_NODE ||
        (isHtmlElement(candidate) && !candidate.hasChildNodes())
      const renderedRect = isTextOrChildlessElement
        ? getRenderedRectOfNode(candidate, 0)
        : undefined

      if (renderedRect) return renderedRect

      candidate = getNextNodeInDocumentOrder(candidate, {
        skipDescendants: false,
      })
    }

    return undefined
  }

  /**
   * Where the page holding a node, from `offset` on, starts in its item.
   *
   * A node that isn't rendered, `display: none` or inside it, is where the
   * content after it is: a hidden page-break marker is on the page it breaks
   * to. With nothing rendered after it, it is past everything shown, on the
   * item's last page.
   *
   * An item laid out as one column is scrolled through, not paginated: the
   * node is where it is down the column, and past everything shown is the
   * column's last screen. The item and its document start together, and the
   * document never scrolls within its frame.
   */
  const getSpineItemPositionFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const renderedRect =
      getRenderedRectOfNode(node, offset) ?? getRenderedRectAfterNode(node)
    const isInOneColumn = isLaidOutAsOneColumn({
      computedPageTurnMode: settings.values.computedPageTurnMode,
      renditionLayout: spineItem.renditionLayout,
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
    })

    if (isInOneColumn)
      return new SpineItemPosition({
        x: 0,
        y:
          renderedRect?.y ??
          Math.max(0, spineItem.layoutInfo.height - viewport.pageSize.height),
      })

    if (!renderedRect)
      return getSpineItemPositionFromPageIndex({
        context,
        isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
        itemLayout: spineItem.layoutInfo,
        pageIndex: spineItem.numberOfPages - 1,
        viewport,
      })

    const pageStartOffsetInSpineItem =
      getClosestValidOffsetFromApproximateOffsetInPages(
        renderedRect.x,
        viewport.pageSize.width,
        spineItem.layoutInfo?.width || 0,
      )

    // @todo vertical
    return new SpineItemPosition({ x: pageStartOffsetInSpineItem, y: 0 })
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
    const { height, width } = spineItem.layoutInfo

    return getSpineItemPageIndexFromSpineItemPosition({
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      position: getSpineItemPositionFromNode(node, offset, spineItem),
      itemHeight: height,
      itemWidth: width,
      isRTL: context.isRTL(),
      pageWidth: viewport.pageSize.width,
      pageHeight: viewport.pageSize.height,
      pageTurnDirection: settings.values.computedPageTurnDirection,
      pageTurnMode: settings.values.computedPageTurnMode,
    })
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
        pageTurnMode: settings.values.computedPageTurnMode,
      }),
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getSpineItemPagePositionFromSpineItemPosition,
  }
}
