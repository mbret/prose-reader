import { Context } from "../../context/Context"
import { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { UnsafeSpineItemPosition } from "../../spineItem/types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationFromSpineItemPosition = ({
  spineItem,
  spineItemPosition,
  spineLocator,
  spineItemLocator,
  context,
}: {
  spineItemPosition: UnsafeSpineItemPosition
  spineItem: SpineItem
  spineLocator: SpineLocator
  spineItemLocator: SpineItemLocator
  context: Context
}) => {
  const navigationInSpineItem =
    spineItemLocator.getSpineItemClosestPositionFromUnsafePosition(
      spineItemPosition,
      spineItem,
    )

  const spinePosition = spineLocator.getSpinePositionFromSpineItemPosition({
    spineItemPosition: navigationInSpineItem,
    spineItem,
  })

  return getAdjustedPositionForSpread({
    position: spinePosition,
    pageSizeWidth: context.getPageSize().width,
    visibleAreaRectWidth: context.state.visibleAreaRect.width,
  })
}
