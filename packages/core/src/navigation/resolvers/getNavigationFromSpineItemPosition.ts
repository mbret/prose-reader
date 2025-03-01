import type { Context } from "../../context/Context"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemLocator } from "../../spineItem/locationResolver"
import type { SpineItemPosition } from "../../spineItem/types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationFromSpineItemPosition = ({
  spineItem,
  spineItemPosition,
  spineLocator,
  spineItemLocator,
  context,
}: {
  spineItemPosition: SpineItemPosition
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
