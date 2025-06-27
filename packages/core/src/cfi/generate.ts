import { generate } from "@prose-reader/cfi"
import type { Manifest } from "@prose-reader/shared"
import type { Spine } from "../spine/Spine"
import type { SpineItem } from "../spineItem/SpineItem"
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
  const ownerDocument =
    "ownerDocument" in nodeOrRange
      ? nodeOrRange.ownerDocument
      : nodeOrRange.startContainer.ownerDocument

  if (
    !ownerDocument ||
    !ownerDocument?.documentElement ||
    nodeOrRange === ownerDocument
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
  pageIndex,
  spineItem,
  spine,
}: {
  pageIndex: number
  spineItem: SpineItem
  spine: Spine
}) => {
  const pageEntry = spine.pages.value.pages.find(
    (page) =>
      page.itemIndex === spineItem.index && page.pageIndex === pageIndex,
  )
  const nodeOrRange = pageEntry?.firstVisibleNode
  const rendererElement = spineItem.renderer.getDocumentFrame()

  if (
    nodeOrRange &&
    rendererElement instanceof HTMLIFrameElement &&
    rendererElement.contentWindow?.document
  ) {
    const cfiString = generateCfi({
      nodeOrRange: nodeOrRange.node,
      offset: nodeOrRange.offset,
      item: spineItem.item,
    })

    return cfiString.trim()
  }

  return generateRootCfi(spineItem.item)
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
