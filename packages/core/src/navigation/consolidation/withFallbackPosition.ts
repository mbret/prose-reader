import { map, type Observable } from "rxjs"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { UnboundSpinePosition } from "../../spine/types"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

export const withFallbackPosition =
  ({
    spineItemsManager,
    navigationResolver,
    settings,
  }: {
    spineItemsManager: SpineItemsManager
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
  }) =>
  <
    Navigation extends {
      navigation: InternalNavigationInput
      previousNavigation: InternalNavigationEntry
    },
  >(
    stream: Observable<Navigation>,
  ): Observable<
    Omit<Navigation, "navigation"> & {
      navigation: InternalNavigationEntry
    }
  > => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItem = spineItemsManager.get(navigation.spineItem)

        if (navigation.position) {
          /**
           * Scrollable mode does allow unbound position by design.
           */
          if (settings.values.computedPageTurnMode === "scrollable") {
            return {
              navigation: {
                ...navigation,
                position: navigation.position,
              },
              ...rest,
            }
          }

          /**
           * We have been given position, we just make sure to prevent navigation
           * in outer edges.
           */
          return {
            navigation: {
              ...navigation,
              position: navigationResolver.fromUnboundSpinePosition(
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
              position: rest.previousNavigation.position,
            },
            ...rest,
          }

        /**
         * Fallback.
         *
         * We get the most appropriate navigation for spine item.
         */
        const position =
          navigationResolver.getNavigationForSpineIndexOrId(spineItem)

        /**
         * We try to maintain x axis for scrollable mode.
         */
        const adjustedPosition =
          settings.values.computedPageTurnMode === "scrollable"
            ? new UnboundSpinePosition({
                x: position.x + rest.previousNavigation.position.x,
                y: position.y,
              })
            : navigationResolver.fromUnboundSpinePosition(position)

        return {
          navigation: {
            ...navigation,
            position: adjustedPosition,
          },
          ...rest,
        }
      }),
    )
  }
