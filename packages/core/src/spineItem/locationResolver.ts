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
    /**
     * A range in an element without text, such as an `img`, is collapsed
     * inside it and has no box, so the element is measured as a whole.
     */
    const elementOrRangeToMeasure =
      isHtmlElement(node) && node.textContent === ``
        ? node
        : getRangeFromNode(node, offset)

    return elementOrRangeToMeasure?.getClientRects().length
      ? elementOrRangeToMeasure.getBoundingClientRect()
      : undefined
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
   */
  const getSpineItemPositionFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const renderedRect =
      getRenderedRectOfNode(node, offset) ?? getRenderedRectAfterNode(node)

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
      pageTurnMode: settings.values.pageTurnMode,
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
        pageTurnMode: settings.values.pageTurnMode,
      }),
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getSpineItemPagePositionFromSpineItemPosition,
  }
}
