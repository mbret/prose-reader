import { generate } from "@prose-reader/cfi"
import type { Manifest } from "@prose-reader/shared"
import type { SpineItem } from "../spineItem/SpineItem"
import type { SpineItemLocator } from "../spineItem/locationResolver"

export const generateRootCfi = (item: Manifest["spineItems"][number]) => {
  return generate({
    spineIndex: item.index,
    spineId: item.id,
  })
}

export const generateCfi = (
  node: Node,
  offset: number,
  item: Manifest["spineItems"][number],
) => {
  if (
    !node.ownerDocument ||
    !node.ownerDocument?.documentElement ||
    node === node.ownerDocument
  )
    return generateRootCfi(item)

  return generate({ node, offset, spineIndex: item.index, spineId: item.id })
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
  spineItemLocator,
}: {
  pageIndex: number
  spineItem: SpineItem
  spineItemLocator: SpineItemLocator
}) => {
  const nodeOrRange = spineItemLocator.getFirstNodeOrRangeAtPage(
    pageIndex,
    spineItem,
  )

  const rendererElement = spineItem.renderer.getDocumentFrame()

  if (
    nodeOrRange &&
    rendererElement instanceof HTMLIFrameElement &&
    rendererElement.contentWindow?.document
  ) {
    const cfiString = generateCfi(
      nodeOrRange.node,
      nodeOrRange.offset,
      spineItem.item,
    )

    return cfiString.trim()
  }

  return generateRootCfi(spineItem.item)
}

/**
 * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
 * so we use two cfi for start and end.
 */
export const generateCfiFromRange = (
  range: Range,
  item: Manifest[`spineItems`][number],
) => {
  const startCFI = generateCfi(range.startContainer, range.startOffset, item)
  const endCFI = generateCfi(range.endContainer, range.endOffset, item)

  return { start: startCFI, end: endCFI }
}

export const generateCfiFromSelection = ({
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

export const getItemAnchor = (item: Manifest["spineItems"][number]) =>
  item.index.toString()
