import { getSpineItemPageIndexFromNode } from "../spineItem/nodeLocation.ts"
import type { SpineItem } from "../spineItem/SpineItem.ts"

/**
 * The rule of `reader.cfi.getSpineItemPageIndexFromCfi`, for the callers that
 * resolve the cfi themselves. It calls `resolveNode` only when the node
 * decides the page.
 */
export const getSpineItemPageIndexOfCfi = ({
  spineItem,
  isRootCfi,
  resolveNode,
}: {
  spineItem: SpineItem
  isRootCfi: boolean
  resolveNode: () => { node: Node | null; offset?: number }
}) => {
  if (spineItem.renditionLayout === `pre-paginated` || isRootCfi) return 0

  // A node's page is measured against the item's last layout, which a layout
  // of the item in progress is changing.
  if (!spineItem.value.isReady || spineItem.value.isDirty) return undefined

  const { node, offset } = resolveNode()

  return node
    ? getSpineItemPageIndexFromNode(node, offset ?? 0, spineItem)
    : undefined
}
