import { map, type Observable, withLatestFrom } from "rxjs"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import { SpinePosition } from "../../spine/types"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry } from "../types"

/**
 * The navigable position of the page a navigation is on.
 */
export const getSnappedPosition = ({
  navigation,
  spineItem,
  spineLocator,
  navigationResolver,
}: {
  navigation: InternalNavigationEntry
  spineItem: SpineItem
  spineLocator: SpineLocator
  navigationResolver: NavigationResolver
}): SpinePosition => {
  /**
   * - position in spine item known
   * - dimensions of item known
   * - we can retrieve the desired page index
   * - we get navigation for same page on current item
   */
  if (
    navigation.positionInSpineItem &&
    navigation.spineItemHeight &&
    navigation.spineItemWidth
  ) {
    const pageIndex =
      spineLocator.spineItemLocator.getSpineItemPageIndexFromPosition({
        itemWidth: navigation.spineItemWidth,
        itemHeight: navigation.spineItemHeight,
        isUsingVerticalWriting: !!navigation.spineItemIsUsingVerticalWriting,
        position: navigation.positionInSpineItem,
      })

    return navigationResolver.getNavigationForSpineItemPage({
      pageIndex,
      spineItemId: spineItem,
    })
  }

  /**
   * - position is within spine item
   * - position is somewhat trustable
   * - we will retrieve the closest valid navigation
   */
  if (spineLocator.isPositionWithinSpineItem(navigation.position, spineItem)) {
    return navigationResolver.getNavigationForPosition(navigation.position)
  }

  /**
   * - position is not within spine item
   * - position is not trustable
   * - fallback to default navigation for spine item
   */
  return navigationResolver.getNavigationForSpineIndexOrId(spineItem)
}

/**
 * Scrollable mode has no page to snap to, and while the user holds the
 * viewport the position is theirs.
 */
export const withSnappedPosition =
  ({
    navigationResolver,
    settings,
    spine,
    isUserInteractionLocked$,
  }: {
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
    spine: Spine
    isUserInteractionLocked$: Observable<boolean>
  }) =>
  <N extends { navigation: InternalNavigationEntry; snapToPage: boolean }>(
    stream: Observable<N>,
  ) =>
    stream.pipe(
      withLatestFrom(isUserInteractionLocked$),
      map(([params, isUserLocked]) => {
        if (
          !params.snapToPage ||
          settings.values.computedPageTurnMode === "scrollable" ||
          isUserLocked
        )
          return params

        const spineItem = spine.spineItemsManager.get(
          params.navigation.spineItem,
        )

        return {
          ...params,
          navigation: {
            ...params.navigation,
            position: spineItem
              ? getSnappedPosition({
                  navigation: params.navigation,
                  spineItem,
                  spineLocator: spine.locator,
                  navigationResolver,
                })
              : new SpinePosition({ x: 0, y: 0 }),
          },
        }
      }),
    )
