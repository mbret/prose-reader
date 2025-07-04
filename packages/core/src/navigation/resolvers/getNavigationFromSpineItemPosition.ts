import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { SpineItemLocator } from "../../spineItem/locationResolver"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemPosition } from "../../spineItem/types"
import type { Viewport } from "../../viewport/Viewport"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationFromSpineItemPosition = ({
  spineItem,
  spineItemPosition,
  spineLocator,
  spineItemLocator,
  viewport,
}: {
  spineItemPosition: SpineItemPosition
  spineItem: SpineItem
  spineLocator: SpineLocator
  spineItemLocator: SpineItemLocator
  viewport: Viewport
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
    pageSizeWidth: viewport.pageSize.width,
    visibleAreaRectWidth: viewport.absoluteViewport.width,
  })
}
