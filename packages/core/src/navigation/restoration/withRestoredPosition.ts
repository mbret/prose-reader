import { map, type Observable } from "rxjs"
import type { InternalNavigationEntry } from "../InternalNavigator"
import { restorePosition } from "./restorePosition"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { Context } from "../../context/Context"
import type { Spine } from "../../spine/Spine"

type Navigation = {
  navigation: InternalNavigationEntry
}

export const withRestoredPosition =
  ({
    settings,
    navigationResolver,
    context,
    spine,
  }: {
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
    context: Context
    spine: Spine
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> =>
    stream.pipe(
      map((params) => ({
        ...params,
        navigation: {
          ...params.navigation,
          position: restorePosition({
            spineLocator: spine.locator,
            navigation: params.navigation,
            navigationResolver,
            settings,
            spineItemsManager: spine.spineItemsManager,
            spineItemLocator: spine.locator.spineItemLocator,
            context,
            spineLayout: spine.spineLayout,
          }),
        },
      })),
    )
