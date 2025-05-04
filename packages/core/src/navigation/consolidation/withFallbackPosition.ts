import { type Observable, map } from "rxjs"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

export const withFallbackPosition =
  ({
    spineItemsManager,
    navigationResolver,
  }: {
    spineItemsManager: SpineItemsManager
    navigationResolver: NavigationResolver
  }) =>
  <Navigation extends { navigation: InternalNavigationInput }>(
    stream: Observable<Navigation>,
  ): Observable<
    Omit<Navigation, "navigation"> & {
      navigation: InternalNavigationEntry
    }
  > => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItem = spineItemsManager.get(navigation.spineItem)

        /**
         * We have been given position, we just make sure to prevent navigation
         * in outer edges.
         */
        if (navigation.position) {
          return {
            navigation: {
              ...navigation,
              position: navigationResolver.getAdjustedPositionWithSafeEdge(
                navigation.position,
              ),
            },
            ...rest,
          }
        }

        if (!spineItem)
          return {
            navigation: {
              ...navigation,
              position: new SpinePosition({ x: 0, y: 0 }),
            },
            ...rest,
          }

        /**
         * Fallback.
         *
         * We get the most appropriate navigation for spine item.
         */
        return {
          navigation: {
            ...navigation,
            position:
              navigationResolver.getNavigationForSpineIndexOrId(spineItem),
          },
          ...rest,
        }
      }),
    )
  }
