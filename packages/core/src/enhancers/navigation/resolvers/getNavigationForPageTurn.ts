import type { Context } from "../../../context/Context"
import type { NavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import type { SettingsInterface } from "../../../settings/SettingsInterface"
import type {
  ComputedCoreSettings,
  CoreInputSettings,
} from "../../../settings/types"
import type { SpineLocator } from "../../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { type SpinePosition, UnboundSpinePosition } from "../../../spine/types"
import type { SpineItem } from "../../../spineItem/SpineItem"
import { SpineItemPosition } from "../../../spineItem/types"
import type { Viewport } from "../../../viewport/Viewport"

/**
 * Where a page turn goes: to the left, or up when pages turn vertically, or
 * to the right, or down.
 */
export type PageTurnSide = "leftOrTop" | "rightOrBottom"

/**
 * The position one page from `position` on `side`: the page next to it in
 * its item, or past the item's edge when it has no page there.
 *
 * @important
 * The page on the right of vertical writing is the one above it, and the
 * page on its left the one below. With a vertical page turn, an item one page
 * wide has no page on either side, so a turn goes past its edge: down for a
 * turn to the right, up for a turn to the left.
 */
const getNavigationForSinglePageTurn = ({
  side,
  position,
  navigationResolver,
  computedPageTurnDirection,
  spineItemsManager,
  spineLocator,
  viewport,
}: {
  side: PageTurnSide
  position: SpinePosition | UnboundSpinePosition
  navigationResolver: NavigationResolver
  computedPageTurnDirection: "horizontal" | "vertical"
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  viewport: Viewport
}): SpinePosition | UnboundSpinePosition => {
  const sideSign = side === "rightOrBottom" ? 1 : -1
  const spineItem =
    spineLocator.getSpineItemFromPosition(position) || spineItemsManager.get(0)

  if (!spineItem) return position

  const spineItemPosition = spineLocator.getSpineItemPositionFromSpinePosition(
    position,
    spineItem,
  )
  const spineItemPositionOnSide = spineItem.pageGeometry.getClosestPageStart(
    spineItem.isUsingVerticalWriting()
      ? new SpineItemPosition({
          x: spineItemPosition.x,
          y: spineItemPosition.y - sideSign * viewport.pageSize.height,
        })
      : new SpineItemPosition({
          x: spineItemPosition.x + sideSign * viewport.pageSize.width,
          y: spineItemPosition.y,
        }),
  )

  const hasPageOnSide = navigationResolver.arePositionsDifferent(
    spineItemPositionOnSide,
    spineItemPosition,
  )

  if (!hasPageOnSide) {
    return computedPageTurnDirection === `horizontal`
      ? new UnboundSpinePosition({
          x: position.x + sideSign * viewport.pageSize.width,
          y: 0,
        })
      : new UnboundSpinePosition({
          y: position.y + sideSign * viewport.pageSize.height,
          x: 0,
        })
  }

  return spineLocator.getSpinePositionFromSpineItemPosition({
    spineItemPosition: spineItemPositionOnSide,
    spineItem,
  })
}

/**
 * The position a page turn to `side` goes to from `position`.
 *
 * Very naive approach for spread. It could be optimized but by using this approach
 * we do not add complexity to the code and use the current logic to handle it correctly.
 *
 * @important
 * Special case for vertical content, read content
 */
export const getNavigationForPageTurn = ({
  side,
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
  side: PageTurnSide
  position: SpinePosition | UnboundSpinePosition
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
}): SpinePosition | UnboundSpinePosition => {
  const sideSign = side === "rightOrBottom" ? 1 : -1

  if (
    settings.values.computedPageTurnMode === "scrollable" &&
    computedPageTurnDirection === "vertical"
  ) {
    return new UnboundSpinePosition({
      x: position.x,
      y: position.y + sideSign * viewport.pageSize.height,
    })
  }

  const singlePageTurnParams = {
    side,
    viewport,
    navigationResolver,
    computedPageTurnDirection,
    spineItemsManager,
    spineLocator,
  }
  const navigation = getNavigationForSinglePageTurn({
    ...singlePageTurnParams,
    position,
  })

  // when we move within vertical content, because only y moves, we don't need two navigation
  if (spineItem.isUsingVerticalWriting() && position.x === navigation.x) {
    return navigationResolver.getAdjustedPositionForSpread(navigation)
  }

  if (viewport.value.isSpread) {
    // in case of spread the entire screen is taken as one real page for vertical content
    // in order to move out from it we add an extra page width.
    // using a single page turn again would keep x as it is and wrongly move y
    // for the next item in case it's also a vertical content
    if (spineItem.isUsingVerticalWriting() && position.x !== navigation.x) {
      const spreadSideSign = context.isRTL() ? -sideSign : sideSign

      return navigationResolver.getAdjustedPositionForSpread(
        new UnboundSpinePosition({
          x: navigation.x + spreadSideSign * viewport.pageSize.width,
          y: navigation.y,
        }),
      )
    }

    /**
     * In case we move vertically and the y is already different, we don't need a second navigation
     * since we already jumped to a new screen
     */
    if (
      computedPageTurnDirection === `vertical` &&
      position.y !== navigation.y
    ) {
      return navigationResolver.getAdjustedPositionForSpread(navigation)
    }

    const doubleNavigation = getNavigationForSinglePageTurn({
      ...singlePageTurnParams,
      position: navigation,
    })

    return navigationResolver.getAdjustedPositionForSpread(doubleNavigation)
  }

  return navigationResolver.getAdjustedPositionForSpread(navigation)
}
