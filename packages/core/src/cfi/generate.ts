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
  spatial,
}: {
  nodeOrRange: Node | Range
  offset?: number
  item: Manifest["spineItems"][number]
  spatial?: [number, number]
}) => {
  const nodeOrRangeOwnerDocument =
    "ownerDocument" in nodeOrRange
      ? nodeOrRange.ownerDocument
      : nodeOrRange.startContainer.ownerDocument

  if (
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
    spatial,
    spineIndex: item.index,
    spineId: item.id,
  })
}

const SPREAD_IMAGE_ID = `spread-image`

const getSpreadImageElement = (node: Node): Element | undefined => {
  const element = node.ownerDocument?.getElementById(SPREAD_IMAGE_ID)

  if (element !== null && element !== undefined) return element

  return undefined
}

const getSpreadSpatialOffset = ({
  isRTL,
  pageIndex,
}: {
  isRTL: boolean
  pageIndex: number
}): [number, number] => {
  const isFirstVisualHalf = pageIndex % 2 === 0
  const x = isRTL ? (isFirstVisualHalf ? 75 : 25) : isFirstVisualHalf ? 25 : 75

  return [x, 50]
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
  pageIndex,
  readingDirection,
}: {
  spineItem: Manifest["spineItems"][number]
  pageNode: NonNullable<PageEntry["firstVisibleNode"]>
  pageIndex?: number
  readingDirection?: Manifest["readingDirection"]
}) => {
  const spreadImageElement = getSpreadImageElement(pageNode.node)
  const shouldGenerateSpreadSpatialCfi =
    pageIndex !== undefined &&
    spineItem.renditionLayout === `reflowable` &&
    spineItem.renditionFlow === `paginated` &&
    spreadImageElement !== undefined

  const cfiString = generateCfi({
    nodeOrRange: shouldGenerateSpreadSpatialCfi
      ? spreadImageElement
      : pageNode.node,
    offset: shouldGenerateSpreadSpatialCfi ? undefined : pageNode.offset,
    item: spineItem,
    spatial: shouldGenerateSpreadSpatialCfi
      ? getSpreadSpatialOffset({
          isRTL: readingDirection === `rtl`,
          pageIndex,
        })
      : undefined,
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
