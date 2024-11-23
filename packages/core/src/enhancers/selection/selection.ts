import { Manifest } from "@prose-reader/shared"
import { generateCfi } from "../../cfi/generate/generateCfi"
import { Report, SpineItem } from "../.."

export const generateCfis = ({
  item,
  selection,
}: {
  selection: Selection
  item: Manifest["spineItems"][number]
}) => {
  const anchorCfi = selection.anchorNode
    ? generateCfi(selection.anchorNode, selection.anchorOffset, item)
    : undefined

  const focusCfi = selection.focusNode
    ? generateCfi(selection.focusNode, selection.focusOffset, item)
    : undefined

  return {
    anchorCfi,
    focusCfi,
  }
}

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

export const createRangeFromSelection = ({
  selection,
  spineItem,
}: {
  selection: {
    anchorNode?: Node
    anchorOffset?: number
    focusNode?: Node
    focusOffset?: number
  }
  spineItem: SpineItem
}) => {
  if (!spineItem.isReady) return undefined

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
