import { map, Observable } from "rxjs"
import { InternalNavigationEntry } from "../InternalNavigator"
import { restorePosition } from "./restorePosition"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { SpineItemLocator } from "../../spineItem/locationResolver"
import { Context } from "../../context/Context"

type Navigation = {
  navigation: InternalNavigationEntry
}

export const withRestoredPosition =
  ({
    spineItemsManager,
    settings,
    spineLocator,
    navigationResolver,
    spineItemLocator,
    context,
  }: {
    spineLocator: SpineLocator
    navigationResolver: NavigationResolver
    spineItemsManager: SpineItemsManager
    settings: ReaderSettingsManager
    spineItemLocator: SpineItemLocator
    context: Context
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> =>
    stream.pipe(
      map((params) => ({
        ...params,
        navigation: {
          ...params.navigation,
          position: restorePosition({
            spineLocator,
            navigation: params.navigation,
            navigationResolver,
            settings,
            spineItemsManager,
            spineItemLocator,
            context,
          }),
        },
      })),
    )
