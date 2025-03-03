import type { DeprecatedViewportPosition } from "../../navigation/controllers/ControlledController"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpinePosition } from "../types"

/**
 * This will retrieve the closest item to the x / y position edge relative to the reading direction.
 */
export const getSpineItemFromPosition = ({
  position,
  spineItemsManager,
  spineLayout,
  settings,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  spineItemsManager: SpineItemsManager
  spineLayout: SpineLayout
  settings: ReaderSettingsManager
}) => {
  const spineItem = spineItemsManager.items.find((item) => {
    const { left, right, bottom, top } =
      spineLayout.getSpineItemSpineLayoutInfo(item)

    const isWithinXAxis = position.x >= left && position.x < right

    if (settings.values.computedPageTurnDirection === `horizontal`) {
      return isWithinXAxis
    }
    return isWithinXAxis && position.y >= top && position.y < bottom
  })

  if (position.x === 0 && !spineItem) {
    return spineItemsManager.items[0]
  }

  return spineItem
}
