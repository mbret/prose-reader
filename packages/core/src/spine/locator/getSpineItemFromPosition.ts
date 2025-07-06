import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpinePosition, UnboundSpinePosition } from "../types"

/**
 * Returns the first element that is within the given position.
 *
 * This method is safe and take into account boundaries.
 */
export const getSpineItemFromPosition = ({
  position,
  spineItemsManager,
  spineLayout,
}: {
  position: SpinePosition | SpinePosition | UnboundSpinePosition
  spineItemsManager: SpineItemsManager
  spineLayout: SpineLayout
}) => {
  const spineItem = spineItemsManager.items.find((item) => {
    const { left, right, bottom, top } =
      spineLayout.getSpineItemSpineLayoutInfo(item)

    const isWithinXAxis = position.x >= left && position.x < right

    const isWithinYAxis = position.y >= top && position.y < bottom

    return isWithinXAxis && isWithinYAxis
  })

  if (position.x === 0 && !spineItem) {
    return spineItemsManager.items[0]
  }

  return spineItem
}
