import {
  getNextNodeInDocumentOrder,
  getRangeFromNode,
  isHtmlElement,
} from "../utils/dom"
import { DocumentFramePlacement } from "./DocumentFramePlacement"
import type { SpineItem } from "./SpineItem"

/**
 * The first box a node lays out, from `offset` on: where it starts, on the
 * page it starts on. `undefined` when it isn't rendered: `display: none`, or
 * inside it. Its boxes as one rect would start on the last page the node
 * reaches when its pages run right to left.
 *
 * A rect alone cannot tell the two apart. A node that isn't rendered
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

  const rangeBox = range?.getClientRects()[0]

  if (rangeBox) return rangeBox

  /**
   * A range that selects no box in an element rendered all the same, such
   * as an `img`, which has no contents, or a `video`, whose sources lay out
   * none: the element is measured itself.
   */
  return isHtmlElement(node) ? node.getClientRects()[0] : undefined
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
 * The page of its item a node starts on, from `offset` on.
 *
 * A node that isn't rendered, `display: none` or inside it, is where the
 * content after it is: a hidden page-break marker is on the page it breaks
 * to. With nothing rendered after it, it is past everything shown, on the
 * item's last page.
 */
export const getSpineItemPageIndexFromNode = (
  node: Node,
  offset: number,
  spineItem: SpineItem,
) => {
  const { pageGeometry } = spineItem
  const renderedBox =
    getRenderedRectOfNode(node, offset) ?? getRenderedRectAfterNode(node)

  if (!renderedBox) return pageGeometry.numberOfPages - 1

  return pageGeometry.getPageIndexFromPosition(
    DocumentFramePlacement.measure(spineItem).toSpineItemPosition(renderedBox),
  )
}

/** Where the page a node starts on, from `offset` on, starts in its item. */
export const getSpineItemPositionFromNode = (
  node: Node,
  offset: number,
  spineItem: SpineItem,
) =>
  spineItem.pageGeometry.getPositionFromPageIndex(
    getSpineItemPageIndexFromNode(node, offset, spineItem),
  )
