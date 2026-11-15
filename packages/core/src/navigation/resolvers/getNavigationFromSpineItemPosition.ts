import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemPosition } from "../../spineItem/types"
import type { Viewport } from "../../viewport/Viewport"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationFromSpineItemPosition = ({
  spineItem,
  spineItemPosition,
  spineLocator,
  viewport,
}: {
  spineItemPosition: SpineItemPosition
  spineItem: SpineItem
  spineLocator: SpineLocator
  viewport: Viewport
}) => {
  const navigationInSpineItem =
    spineItem.pageGeometry.getClosestPageStart(spineItemPosition)

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
