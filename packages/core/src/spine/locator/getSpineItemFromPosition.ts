import type { DeprecatedViewportPosition } from "../../navigation/types"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpinePosition, UnsafeSpinePosition } from "../types"

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
  position: DeprecatedViewportPosition | SpinePosition | UnsafeSpinePosition
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
