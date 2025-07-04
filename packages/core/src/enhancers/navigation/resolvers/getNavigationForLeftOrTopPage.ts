import type { Context } from "../../../context/Context"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { DeprecatedViewportPosition } from "../../../navigation/types"
import type { SettingsInterface } from "../../../settings/SettingsInterface"
import type {
  ComputedCoreSettings,
  CoreInputSettings,
} from "../../../settings/types"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import type { SpinePosition } from "../../../spine/types"
import type { SpineItem } from "../../../spineItem/SpineItem"
import type { Viewport } from "../../../viewport/Viewport"
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
  viewport,
  settings,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  spineItem: SpineItem
  context: Context
  spineItemsManager: SpineItemsManager
  navigationResolver: NavigationResolver
  spineLocator: SpineLocator
  computedPageTurnDirection: "horizontal" | "vertical"
  viewport: Viewport
  settings: SettingsInterface<
    CoreInputSettings,
    CoreInputSettings & ComputedCoreSettings
  >
}): DeprecatedViewportPosition => {
  const navigation = getNavigationForLeftSinglePage({
    position,
    viewport,
    navigationResolver,
    computedPageTurnDirection,
    spineItemsManager,
    spineLocator,
  })

  // when we move withing vertical content, because only y moves, we don't need two navigation
  if (spineItem?.isUsingVerticalWriting() && position.x === navigation.x) {
    return navigationResolver.getAdjustedPositionForSpread(navigation)
  }

  if (settings.values.computedSpreadMode) {
    // in case of spread the entire screen is taken as one real page for vertical content
    // in order to move out from it we add an extra page width.
    // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
    // for the next item in case it's also a vertical content
    if (spineItem?.isUsingVerticalWriting() && position.x !== navigation.x) {
      return navigationResolver.getAdjustedPositionForSpread(
        navigationResolver.getAdjustedPositionWithSafeEdge(
          context.isRTL()
            ? { ...navigation, x: navigation.x + viewport.pageSize.width }
            : {
                ...navigation,
                x: navigation.x - viewport.pageSize.width,
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
      viewport,
      navigationResolver,
      computedPageTurnDirection,
      spineItemsManager,
      spineLocator,
    })

    return navigationResolver.getAdjustedPositionForSpread(doubleNavigation)
  }

  return navigationResolver.getAdjustedPositionForSpread(navigation)
}
