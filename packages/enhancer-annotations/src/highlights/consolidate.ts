import { Reader } from "@prose-reader/core"
import { Highlight } from "./Highlight"

export const consolidate = (highlight: Highlight, reader: Reader) => {
  const { itemIndex } = reader.cfi.parseCfi(highlight.anchorCfi ?? "")
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!spineItem) return

  if (spineItem.item.renditionLayout === `pre-paginated`) {
    highlight.spineItemPageIndex = 0
  } else {
    const { node, offset = 0 } = reader.cfi.resolveCfi({ cfi: highlight.anchorCfi ?? "" }) ?? {}

    if (node) {
      highlight.spineItemPageIndex = reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(node, offset, spineItem)
    }
  }

  if (highlight.spineItemPageIndex !== undefined) {
    highlight.absolutePageIndex = reader.spine.locator.getAbsolutePageIndexFromPageIndex({
      pageIndex: highlight.spineItemPageIndex,
      spineItemOrId: spineItem,
    })
  }
}
