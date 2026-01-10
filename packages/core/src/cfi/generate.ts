import { generate } from "@prose-reader/cfi"
import type { Manifest } from "@prose-reader/shared"
import type { PageEntry } from "../spine/Pages"
import { isHtmlRange } from "../utils/dom"

export const generateRootCfi = (item: Manifest["spineItems"][number]) => {
  return generate({
    spineIndex: item.index,
    spineId: item.id,
  })
}

const generateCfi = ({
  nodeOrRange,
  offset,
  item,
}: {
  nodeOrRange: Node | Range
  offset?: number
  item: Manifest["spineItems"][number]
}) => {
  const nodeOrRangeOwnerDocument =
    "ownerDocument" in nodeOrRange
      ? nodeOrRange.ownerDocument
      : nodeOrRange.startContainer.ownerDocument

  if (
    !nodeOrRangeOwnerDocument ||
    !nodeOrRangeOwnerDocument?.documentElement ||
    nodeOrRange === nodeOrRangeOwnerDocument
  )
    return generateRootCfi(item)

  if (isHtmlRange(nodeOrRange)) {
    return generate({
      start: {
        node: nodeOrRange.startContainer,
        offset: nodeOrRange.startOffset,
        spineIndex: item.index,
        spineId: item.id,
      },
      end: {
        node: nodeOrRange.endContainer,
        offset: nodeOrRange.endOffset,
        spineIndex: item.index,
        spineId: item.id,
      },
    })
  }

  return generate({
    node: nodeOrRange,
    offset,
    spineIndex: item.index,
    spineId: item.id,
  })
}

/**
 * Heavy cfi hookup. Use it to have a refined, precise cfi anchor. It requires the content to be loaded otherwise
 * it will return a root cfi.
 *
 * @todo optimize
 */
export const generateCfiForSpineItemPage = ({
  spineItem,
  pageNode,
}: {
  spineItem: Manifest["spineItems"][number]
  pageNode: NonNullable<PageEntry["firstVisibleNode"]>
}) => {
  const cfiString = generateCfi({
    nodeOrRange: pageNode.node,
    offset: pageNode.offset,
    item: spineItem,
  })

  return cfiString.trim()
}

export const generateCfiFromRange = (
  range: Range,
  item: Manifest[`spineItems`][number],
) => {
  return generateCfi({
    nodeOrRange: range,
    item,
  })
}

export const getItemAnchor = (item: Manifest["spineItems"][number]) =>
  item.index.toString()
