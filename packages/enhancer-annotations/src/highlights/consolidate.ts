import { Reader } from "@prose-reader/core"
import { Highlight } from "./Highlight"

export const consolidate = (highlight: Highlight, reader: Reader) => {
  const { itemIndex } = reader.cfi.parseCfi(highlight.anchorCfi ?? "")
  const spineItem = reader.spineItemsManager.get(itemIndex)
  const resolvedAnchorCfi = reader.cfi.resolveCfi({ cfi: highlight.anchorCfi ?? "" })
  const resolvedFocusCfi = reader.cfi.resolveCfi({ cfi: highlight.focusCfi ?? "" })

  if (!spineItem) return

  if (spineItem.item.renditionLayout === `pre-paginated`) {
    highlight.spineItemPageIndex = 0
  } else {
    if (resolvedAnchorCfi?.node) {
      highlight.spineItemPageIndex = reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
        resolvedAnchorCfi.node,
        resolvedAnchorCfi.offset ?? 0,
        spineItem,
      )
    }
  }

  if (resolvedAnchorCfi?.node && resolvedFocusCfi?.node && spineItem.isReady) {
    const range = reader.selection.createRangeFromSelection({
      selection: {
        anchorNode: resolvedAnchorCfi.node,
        anchorOffset: resolvedAnchorCfi.offset ?? 0,
        focusNode: resolvedFocusCfi.node,
        focusOffset: resolvedFocusCfi.offset ?? 0,
      },
      spineItem,
    })

    highlight.range = range
    highlight.selectionAsText = range?.toString()
  } else {
    highlight.range = undefined
  }

  if (highlight.spineItemPageIndex !== undefined) {
    highlight.absolutePageIndex = reader.spine.locator.getAbsolutePageIndexFromPageIndex({
      pageIndex: highlight.spineItemPageIndex,
      spineItemOrId: spineItem,
    })
  }
}
