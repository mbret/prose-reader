import { report } from "../report"

export const getElementsForRange = (range: Range, container: HTMLElement) => {
  // Get all rects and group them by line (based on vertical position)
  const rects = Array.from(range.getClientRects())
  const lineGroups = new Map<number, DOMRect[]>()

  rects.forEach((rect) => {
    const lineY = Math.round(rect.top) // Round to handle minor pixel differences
    if (!lineGroups.has(lineY)) {
      lineGroups.set(lineY, [])
    }
    lineGroups.get(lineY)?.push(rect)
  })

  // Create one highlight element per line
  return Array.from(lineGroups.values()).map((lineRects) => {
    // Find the leftmost and rightmost points
    const left = Math.min(...lineRects.map((r) => r.left))
    const right = Math.max(...lineRects.map((r) => r.right))
    const top = lineRects[0]?.top
    const height = lineRects[0]?.height

    const rectElt = container.ownerDocument.createElement("div")
    rectElt.style.cssText = `
        position: absolute;
        width: ${right - left}px;
        height: ${height}px;
        top: ${top}px;
        left: ${left}px;
        background-color: green;
        opacity: 50%;
    `

    return rectElt
  })
}

export const getRangeFromSelection = (
  overlayElement: HTMLElement,
  anchor: { node: Node; offset?: number },
  focus: { node: Node; offset?: number },
) => {
  const range = overlayElement.ownerDocument.createRange()
  const comparison = anchor.node.compareDocumentPosition(focus.node)

  try {
    // If focus comes before anchor in the document
    if (comparison & Node.DOCUMENT_POSITION_PRECEDING) {
      range.setStart(focus.node, focus.offset || 0)
      range.setEnd(anchor.node, anchor.offset || 0)
      // If focus comes after anchor in the document
    } else if (comparison & Node.DOCUMENT_POSITION_FOLLOWING) {
      range.setStart(anchor.node, anchor.offset || 0)
      range.setEnd(focus.node, focus.offset || 0)
    }
    // If they're the same node
    else {
      const startOffset = Math.min(anchor.offset || 0, focus.offset || 0)
      const endOffset = Math.max(anchor.offset || 0, focus.offset || 0)
      range.setStart(anchor.node, startOffset)
      range.setEnd(anchor.node, endOffset)
    }
  } catch (e) {
    report.error(e)
  }

  return range
}
