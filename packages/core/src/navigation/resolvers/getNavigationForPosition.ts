import type { Context } from "../../context/Context"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition } from "../../spine/types"
import type { SpineItemNavigationResolver } from "../../spineItem/navigationResolver"
import type { DeprecatedViewportPosition } from "../controllers/ControlledController"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"

export const getNavigationForPosition = ({
  viewportPosition,
  spineLocator,
  context,
  spineItemNavigationResolver,
}: {
  viewportPosition: DeprecatedViewportPosition | SpinePosition
  spineLocator: SpineLocator
  context: Context
  spineItemNavigationResolver: SpineItemNavigationResolver
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
      pageSizeWidth: context.getPageSize().width,
      visibleAreaRectWidth: context.state.visibleAreaRect.width,
    })
  }

  return new SpinePosition({ x: 0, y: 0 })
}
