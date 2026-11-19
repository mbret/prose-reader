import type { SpineLocator } from "../../spine/locator/SpineLocator.ts"
import type { SpineItem } from "../../spineItem/SpineItem.ts"
import type { SpineItemPosition } from "../../spineItem/types.ts"
import type { Viewport } from "../../viewport/Viewport.ts"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread.ts"

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
    spineItem.pageGeometry.snapPositionToPageGrid(spineItemPosition)

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
