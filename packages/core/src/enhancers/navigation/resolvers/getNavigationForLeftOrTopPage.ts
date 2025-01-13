import type { Context } from "../../../context/Context"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { ViewportPosition } from "../../../navigation/viewport/ViewportNavigator"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItem } from "../../../spineItem/SpineItem"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { getNavigationForLeftSinglePage } from "./getNavigationForLeftSinglePage"

/**
 * Very naive approach for spread. It could be optimized but by using this approach
 * we do not add complexity to the code and use the current logic to handle it correctly.
 *
 * @important
 * Special case for vertical content, read content
 */
export const getNavigationForLeftOrTopPage = ({
  position,
  spineItem,
  context,
  navigationResolver,
  spineItemsManager,
  spineLocator,
  computedPageTurnDirection,
}: {
  position: ViewportPosition
  spineItem: SpineItem
  context: Context
  spineItemsManager: SpineItemsManager
  navigationResolver: NavigationResolver
  spineLocator: SpineLocator
  computedPageTurnDirection: "horizontal" | "vertical"
}): ViewportPosition => {
  const navigation = getNavigationForLeftSinglePage({
    position,
    context,
    navigationResolver,
    computedPageTurnDirection,
    spineItemsManager,
    spineLocator,
  })

  // when we move withing vertical content, because only y moves, we don't need two navigation
  if (spineItem?.isUsingVerticalWriting() && position.x === navigation.x) {
    return navigationResolver.getAdjustedPositionForSpread(navigation)
  }

  if (context.state.isUsingSpreadMode) {
    // in case of spread the entire screen is taken as one real page for vertical content
    // in order to move out from it we add an extra page width.
    // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
    // for the next item in case it's also a vertical content
    if (spineItem?.isUsingVerticalWriting() && position.x !== navigation.x) {
      return navigationResolver.getAdjustedPositionForSpread(
        navigationResolver.getAdjustedPositionWithSafeEdge(
          context.isRTL()
            ? { ...navigation, x: navigation.x + context.getPageSize().width }
            : {
                ...navigation,
                x: navigation.x - context.getPageSize().width,
              },
        ),
      )
    }

    /**
     * In vase we move vertically and the y is already different, we don't need a second navigation
     * since we already jumped to a new screen
     */
    if (
      computedPageTurnDirection === `vertical` &&
      position.y !== navigation.y
    ) {
      return navigationResolver.getAdjustedPositionForSpread(navigation)
    }

    const doubleNavigation = getNavigationForLeftSinglePage({
      position: navigation,
      context,
      navigationResolver,
      computedPageTurnDirection,
      spineItemsManager,
      spineLocator,
    })

    return navigationResolver.getAdjustedPositionForSpread(doubleNavigation)
  }

  return navigationResolver.getAdjustedPositionForSpread(navigation)
}
