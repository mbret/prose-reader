import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"

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
              position: navigationResolver.wrapPositionWithSafeEdge(
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
              position: { x: 0, y: 0 },
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
