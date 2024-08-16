import { Reader } from "@prose-reader/core"
import { RuntimeBookmark } from "../types"

const consolidateCfiInfo = ({ bookmark, reader }: { reader: Reader; bookmark: RuntimeBookmark }): RuntimeBookmark => {
  if (bookmark.offset !== undefined && bookmark.node !== undefined && bookmark.itemIndex !== undefined) return bookmark

  const { spineItemIndex, node, offset } = reader.cfi.resolveCfi({ cfi: bookmark.cfi }) ?? {}

  return {
    ...bookmark,
    itemIndex: spineItemIndex,
    node,
    offset,
  }
}

export const consolidateBookmark = ({ bookmark, reader }: { reader: Reader; bookmark: RuntimeBookmark }) => {
  const { itemIndex, node, offset } = consolidateCfiInfo({ reader, bookmark })
  const spineItem = reader.spineItemsManager.get(itemIndex)

  if (!node || offset === undefined || !spineItem) return bookmark

  const spineItemPageIndex = reader.spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(node, offset, spineItem)

  if (spineItemPageIndex === undefined) return bookmark

  const absolutePageIndex = reader.spine.locator.getAbsolutePageIndexFromPageIndex({
    pageIndex: spineItemPageIndex,
    spineItemOrId: spineItem,
  })

  return {
    ...bookmark,
    itemIndex,
    node,
    offset,
    absolutePageIndex,
    pageIndex: spineItemPageIndex,
  } satisfies RuntimeBookmark
}
