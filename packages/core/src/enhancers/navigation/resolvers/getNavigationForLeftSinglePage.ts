import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../../spine/types"
import type { Viewport } from "../../../viewport/Viewport"
import { getSpineItemPositionForLeftPage } from "./getSpineItemPositionForLeftPage"

export const getNavigationForLeftSinglePage = ({
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

  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )

  const spineItemNavigation = getSpineItemPositionForLeftPage({
    position: spineItemPosition,
    spineItem,
    pageHeight: viewport.pageSize.height,
    pageWidth: viewport.pageSize.width,
    spineItemLocator: spineLocator.spineItemLocator,
  })

  const isNewNavigationInCurrentItem = navigationResolver.arePositionsDifferent(
    spineItemNavigation,
    spineItemPosition,
  )

  if (!isNewNavigationInCurrentItem) {
    return navigationResolver.fromUnboundSpinePosition(
      pageTurnDirection === `horizontal`
        ? new SpinePosition({
            x: position.x - viewport.pageSize.width,
            y: 0,
          })
        : new SpinePosition({
            y: position.y - viewport.pageSize.height,
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
