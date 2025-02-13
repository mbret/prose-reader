import type { Context } from "../../../context/Context"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { ViewportPosition } from "../../../navigation/viewport/ViewportNavigator"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { getSpineItemPositionForRightPage } from "./getSpineItemPositionForRightPage"

export const getNavigationForRightSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  context,
}: {
  position: ViewportPosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  context: Context
}): ViewportPosition => {
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
        ? { x: position.x + context.getPageSize().width, y: 0 }
        : { y: position.y + context.getPageSize().height, x: 0 },
    )
  }
  const readingOrderPosition =
    spineLocator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigationForRightPage,
      spineItem,
    })

  return readingOrderPosition
}
