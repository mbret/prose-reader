import {
  getNextNodeInDocumentOrder,
  getRangeFromNode,
  isHtmlElement,
} from "../utils/dom"
import type { SpineItem } from "./SpineItem"
import { SpineItemPosition } from "./types"

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
 */
export const getSpineItemPositionFromNode = (
  node: Node,
  offset: number,
  spineItem: SpineItem,
) => {
  const { pageGeometry } = spineItem
  const renderedRect =
    getRenderedRectOfNode(node, offset) ?? getRenderedRectAfterNode(node)

  if (!renderedRect)
    return pageGeometry.getPositionFromPageIndex(pageGeometry.numberOfPages - 1)

  // @todo vertical
  return pageGeometry.getClosestPageStart(
    new SpineItemPosition({ x: renderedRect.x, y: 0 }),
  )
}

/**
 * The index of the page holding a node, from `offset` on, in its item.
 */
export const getSpineItemPageIndexFromNode = (
  node: Node,
  offset: number,
  spineItem: SpineItem,
) =>
  spineItem.pageGeometry.getPageIndexFromPosition(
    getSpineItemPositionFromNode(node, offset, spineItem),
  )
