import type { Context } from "../../../context/Context"
import type { DeprecatedViewportPosition } from "../../../navigation/controllers/ControlledController"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import { SpinePosition } from "../../../spine/types"
import { getSpineItemPositionForLeftPage } from "./getSpineItemPositionForLeftPage"

export const getNavigationForLeftSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  context,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  context: Context
}): DeprecatedViewportPosition | SpinePosition => {
  const pageTurnDirection = computedPageTurnDirection
  const spineItem =
    spineLocator.getSpineItemFromPosition(position) || spineItemsManager.get(0)
  const defaultNavigation = position

  if (!spineItem) {
    return defaultNavigation
  }

  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )

  const spineItemNavigation = getSpineItemPositionForLeftPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: context.getPageSize().height,
    pageWidth: context.getPageSize().width,
    spineItemLocator: spineLocator.spineItemLocator,
  })

  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigation,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return navigationResolver.getAdjustedPositionWithSafeEdge(
      pageTurnDirection === `horizontal`
        ? new SpinePosition({
            x: position.x - context.getPageSize().width,
            y: 0,
          })
        : new SpinePosition({
            y: position.y - context.getPageSize().height,
            x: 0,
          }),
    )
  }
  const readingOrderPosition =
    spineLocator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigation,
      spineItem,
    })

  return readingOrderPosition
}
