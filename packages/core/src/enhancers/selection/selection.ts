import { Report, type SpineItem } from "../.."

export const getRangeFromSelection = (
  anchor: { node: Node; offset?: number },
  focus: { node: Node; offset?: number },
) => {
  const range = anchor.node.ownerDocument?.createRange()
  const comparison = anchor.node.compareDocumentPosition(focus.node)

  if (!range) return undefined

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
    Report.warn("Failed to create range from selection", e, {
      anchor,
      focus,
    })
  }

  return range
}

export const createOrderedRangeFromSelection = ({
  selection,
  spineItem,
}: {
  selection: {
    anchorNode?: Node | null
    anchorOffset?: number
    focusNode?: Node | null
    focusOffset?: number
  }
  spineItem: SpineItem
}) => {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection

  if (!anchorNode || !focusNode) {
    return undefined
  }

  try {
    return getRangeFromSelection(
      { node: anchorNode, offset: anchorOffset },
      { node: focusNode, offset: focusOffset },
    )
  } catch (e) {
    Report.warn("Failed to create range from selection", e, {
      selection,
      spineItem,
    })

    return undefined
  }
}
