import { map, type Observable, switchMap } from "rxjs"
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry } from "../types"
import { restorePosition } from "./restorePosition"

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
      switchMap((params) => {
        return restorePosition({
          spineLocator: spine.locator,
          navigation: params.navigation,
          navigationResolver,
          settings,
          spineItemsManager: spine.spineItemsManager,
          spineItemLocator: spine.locator.spineItemLocator,
          context,
          spine,
        }).pipe(
          map((restoredPosition) => ({
            ...params,
            navigation: {
              ...params.navigation,
              position: restoredPosition,
            },
          })),
        )
      }),
    )
