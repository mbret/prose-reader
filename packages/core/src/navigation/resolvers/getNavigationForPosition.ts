import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition } from "../../spine/types"
import type { SpineItemNavigationResolver } from "../../spineItem/navigationResolver"
import type { Viewport } from "../../viewport/Viewport"
import type { DeprecatedViewportPosition } from "../types"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationForPosition = ({
  viewportPosition,
  spineLocator,
  spineItemNavigationResolver,
  viewport,
}: {
  viewportPosition: DeprecatedViewportPosition | SpinePosition
  spineLocator: SpineLocator
  spineItemNavigationResolver: SpineItemNavigationResolver
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
      spineItemNavigationResolver.getNavigationForPosition(
        spineItem,
        spineItemPosition,
      )

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
