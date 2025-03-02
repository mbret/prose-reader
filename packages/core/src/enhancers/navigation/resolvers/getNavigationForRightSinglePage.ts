import type { Context } from "../../../context/Context"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { DeprecatedViewportPosition } from "../../../navigation/viewport/ViewportNavigator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import { SpinePosition } from "../../../spine/types"
import { getSpineItemPositionForRightPage } from "./getSpineItemPositionForRightPage"

export const getNavigationForRightSinglePage = ({
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

  // translate viewport position into reading item local position
  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )

  // get reading item local position for right page
  const spineItemNavigationForRightPage = getSpineItemPositionForRightPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: context.getPageSize().height,
    pageWidth: context.getPageSize().width,
    spineItemLocator: spineLocator.spineItemLocator,
  })

  // check both position to see if we moved out of it
  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigationForRightPage,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return navigationResolver.getAdjustedPositionWithSafeEdge(
      pageTurnDirection === `horizontal`
        ? new SpinePosition({
            x: position.x + context.getPageSize().width,
            y: 0,
          })
        : new SpinePosition({
            y: position.y + context.getPageSize().height,
            x: 0,
          }),
    )
  }
  const readingOrderPosition =
    spineLocator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigationForRightPage,
      spineItem,
    })

  return readingOrderPosition
}
