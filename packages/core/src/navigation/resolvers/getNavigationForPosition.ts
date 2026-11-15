import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import type { Viewport } from "../../viewport/Viewport"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationForPosition = ({
  viewportPosition,
  spineLocator,
  viewport,
}: {
  viewportPosition: SpinePosition | UnboundSpinePosition
  spineLocator: SpineLocator
  viewport: Viewport
}) => {
  const spineItem = spineLocator.getSpineItemFromPosition(viewportPosition)

  if (spineItem) {
    const spineItemPosition =
      spineLocator.getSpineItemPositionFromSpinePosition(
        viewportPosition,
        spineItem,
      )

    const spineItemValidPosition =
      spineItem.pageGeometry.getClosestPageStart(spineItemPosition)

    const viewportNavigation =
      spineLocator.getSpinePositionFromSpineItemPosition({
        spineItemPosition: spineItemValidPosition,
        spineItem,
      })

    return getAdjustedPositionForSpread({
      position: viewportNavigation,
      pageSizeWidth: viewport.pageSize.width,
      visibleAreaRectWidth: viewport.absoluteViewport.width,
    })
  }

  return new SpinePosition({ x: 0, y: 0 })
}
