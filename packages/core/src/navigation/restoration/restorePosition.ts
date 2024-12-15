import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { InternalNavigationEntry } from "../InternalNavigator"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { ViewportPosition } from "../viewport/ViewportNavigator"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"
import { SpineLayout } from "../../spine/SpineLayout"

const restoreNavigationForScrollingPageTurnMode = ({
  navigation,
  spineLocator,
  spineItemsManager,
  settings,
  navigationResolver,
  spineLayout,
}: {
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  settings: ReaderSettingsManager
  navigationResolver: NavigationResolver
  navigation: InternalNavigationEntry
  spineLayout: SpineLayout
}): InternalNavigationEntry["position"] => {
  const { spineItem } = navigation
  const foundSpineItem = spineItemsManager.get(spineItem)

  if (!foundSpineItem) return { x: 0, y: 0 }

  const { height, top } = spineLayout.getAbsolutePositionOf(foundSpineItem)

  const isPositionWithinSpineItem = spineLocator.isPositionWithinSpineItem(
    navigation.position,
    foundSpineItem,
  )

  const positionInSpineItem = navigation.positionInSpineItem ?? {
    y: 0,
    x: 0,
  }

  /**
   * - vertical scroll
   */
  if (settings.values.computedPageTurnDirection === "vertical") {
    /**
     * - item did not shift
     * - item same height
     * - we are still within the item
     */
    if (
      top === navigation.spineItemTop &&
      height === navigation.spineItemHeight &&
      isPositionWithinSpineItem
    ) {
      /**
       * -> nothing
       */
      return navigation.position
    }

    /**
     * vertical scroll
     * - item did not shift
     * - item same height
     * - not within item
     */
    if (
      top === navigation.spineItemTop &&
      height === navigation.spineItemHeight &&
      !isPositionWithinSpineItem
    ) {
      /**
       * -> fallback to begining of item
       */
      return navigationResolver.getNavigationForSpineIndexOrId(foundSpineItem)
    }

    /**
     * - item shifted
     */
    if (top !== navigation.spineItemTop) {
      /**
       * -> fallback to position we were in spine item
       */
      const positionInSpineItem =
        spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
          navigation.positionInSpineItem ?? {
            x: 0,
            y: 0,
          },
          foundSpineItem,
        )

      return spineLocator.getSpinePositionFromSpineItemPosition({
        spineItemPosition: positionInSpineItem,
        spineItem: foundSpineItem,
      })
    }

    /**
     * - item did not shift
     * - height changed
     */
    if (
      top === navigation.spineItemTop &&
      height !== navigation.spineItemHeight
    ) {
      const positionYfromBottomPreviousNavigation =
        (navigation.spineItemHeight ?? positionInSpineItem.y) -
        positionInSpineItem.y

      const positionInspineItem = {
        y:
          navigation.directionFromLastNavigation === "backward"
            ? height - positionYfromBottomPreviousNavigation
            : positionInSpineItem.y,
        x: navigation.position.x,
      }

      /**
       * - position within item
       *
       * @problems
       * - position may be wrong since the item changed its content
       *
       * @restoration
       * We try to get as much as info as possible from previous navigation
       * so we can find the best accurate spot the user was
       */
      if (isPositionWithinSpineItem) {
        /**
         * - we navigate to the closest valid position
         */
        const positionInSpineItem =
          spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
            positionInspineItem,
            foundSpineItem,
          )

        return spineLocator.getSpinePositionFromSpineItemPosition({
          spineItemPosition: positionInSpineItem,
          spineItem: foundSpineItem,
        })
      }

      /**
       * - position not within item anymore
       */
      if (!isPositionWithinSpineItem) {
        const positionIsBeforeItem = navigation.position.y < top

        /**
         * In case the navigation is too far down, we try to anchor back to
         * the spine item but we also try to keep the same previous offset
         * we had, the point is not to just anchor back to the begining or the
         * exact end of the spine item.
         * example:
         * - we are at 100px from bottom of a 300px height item
         * - layout happens and item becomes 200px height
         * - we are now at the end of item, we need to go back by 100px
         */
        if (!positionIsBeforeItem) {
          const positionInItem = {
            y: height - positionYfromBottomPreviousNavigation,
            x: navigation.position.x,
          }

          return spineLocator.getSpinePositionFromSpineItemPosition({
            spineItemPosition:
              spineLocator.getSafeSpineItemPositionFromUnsafeSpineItemPosition(
                positionInItem,
                foundSpineItem,
              ),
            spineItem: foundSpineItem,
          })
        }

        /**
         * - we anchor back to begining of item
         */
        return navigationResolver.getNavigationForSpineIndexOrId(foundSpineItem)
      }
    }
  }

  return navigation.position
}

export const restorePosition = ({
  navigation,
  spineItemsManager,
  settings,
  spineLocator,
  navigationResolver,
  spineLayout,
}: {
  spineLocator: SpineLocator
  settings: ReaderSettingsManager
  navigationResolver: NavigationResolver
  navigation: InternalNavigationEntry
  spineItemsManager: SpineItemsManager
  spineItemLocator: SpineItemLocator
  context: Context
  spineLayout: SpineLayout
}): ViewportPosition => {
  if (settings.values.computedPageTurnMode === "scrollable") {
    return restoreNavigationForScrollingPageTurnMode({
      navigation,
      spineLocator,
      navigationResolver,
      settings,
      spineItemsManager,
      spineLayout,
    })
  }

  return restoreNavigationForControlledPageTurnMode({
    navigation,
    spineLocator,
    navigationResolver,
    spineItemsManager,
    spineLayout,
  })
}
