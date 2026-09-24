import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { type SpinePosition, UnboundSpinePosition } from "../../../spine/types"
import type { Viewport } from "../../../viewport/Viewport"
import { getSpineItemPositionForPage } from "./getSpineItemPositionForPage"
import {
  getPageNavigationDirectionSign,
  type PageNavigationDirection,
} from "./pageNavigationDirection"

/**
 * @important
 * Although we only check for the horizontal page in the requested direction, it
 * has the side effect to work for vertical controlled books: when checking the
 * left/right page we will get nothing and therefore move the cursor to the next
 * valid position, in turn getting the next top/bottom page.
 */
export const getNavigationForSinglePage = ({
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  viewport,
  direction,
}: {
  position: SpinePosition | UnboundSpinePosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  viewport: Viewport
  direction: PageNavigationDirection
}): SpinePosition | UnboundSpinePosition => {
  const sign = getPageNavigationDirectionSign(direction)
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

  // get reading item local position for the target page
  const spineItemNavigation = getSpineItemPositionForPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: viewport.pageSize.height,
    pageWidth: viewport.pageSize.width,
    spineItemLocator: spineLocator.spineItemLocator,
    direction,
  })

  // check both position to see if we moved out of it
  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigation,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return pageTurnDirection === `horizontal`
      ? new UnboundSpinePosition({
          x: position.x + sign * viewport.pageSize.width,
          y: 0,
        })
      : new UnboundSpinePosition({
          y: position.y + sign * viewport.pageSize.height,
          x: 0,
        })
  }

  const readingOrderPosition =
    spineLocator.getSpinePositionFromSpineItemPosition({
      spineItemPosition: spineItemNavigation,
      spineItem,
    })

  return readingOrderPosition
}
