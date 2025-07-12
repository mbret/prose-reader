import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { type SpinePosition, UnboundSpinePosition } from "../../../spine/types"
import type { Viewport } from "../../../viewport/Viewport"
import { getSpineItemPositionForRightPage } from "./getSpineItemPositionForRightPage"

/**
 * @important
 * Although we check for right page, it has the side effect to work for vertical
 * controlled books because when checking right page, we will get nothing and therefore
 * move the cursor to the next valid position, in turn getting the next bottom page.
 */
export const getNavigationForRightOrBottomSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  viewport,
}: {
  position: SpinePosition | UnboundSpinePosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  viewport: Viewport
}): SpinePosition | UnboundSpinePosition => {
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
  const positionsAreDifferent = navigationResolver.arePositionsDifferent(
    spineItemNavigationForRightPage,
    spineItemPosition,
  )

  if (!positionsAreDifferent) {
    return navigationResolver.fromUnboundSpinePosition(
      pageTurnDirection === `horizontal`
        ? new UnboundSpinePosition({
            x: position.x + viewport.pageSize.width,
            y: 0,
          })
        : new UnboundSpinePosition({
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
