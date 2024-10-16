import { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineLayout } from "../SpineLayout"

/**
 * This will retrieve the closest item to the x / y position edge relative to the reading direction.
 */
export const getSpineItemFromPosition = ({
  position,
  spineItemsManager,
  spineLayout,
  settings,
}: {
  position: ViewportPosition
  spineItemsManager: SpineItemsManager
  spineLayout: SpineLayout
  settings: ReaderSettingsManager
}) => {
  const spineItem = spineItemsManager.items.find((item) => {
    const { left, right, bottom, top } = spineLayout.getAbsolutePositionOf(item)

    const isWithinXAxis = position.x >= left && position.x < right

    if (settings.values.computedPageTurnDirection === `horizontal`) {
      return isWithinXAxis
    } else {
      return isWithinXAxis && position.y >= top && position.y < bottom
    }
  })

  if (position.x === 0 && !spineItem) {
    return spineItemsManager.items[0]
  }

  return spineItem
}
