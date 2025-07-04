import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { DeprecatedViewportPosition } from "../../../navigation/types"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { SpinePosition } from "../../../spine/types"
import type { Viewport } from "../../../viewport/Viewport"
import { getSpineItemPositionForRightPage } from "./getSpineItemPositionForRightPage"

export const getNavigationForRightSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  viewport,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  viewport: Viewport
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
    pageHeight: viewport.pageSize.height,
    pageWidth: viewport.pageSize.width,
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
            x: position.x + viewport.pageSize.width,
            y: 0,
          })
        : new SpinePosition({
            y: position.y + viewport.pageSize.height,
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
