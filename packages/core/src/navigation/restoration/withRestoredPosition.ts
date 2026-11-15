import { map, type Observable, switchMap } from "rxjs"
import type { CfiManager } from "../../cfi"
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
    spine,
    cfiManager,
  }: {
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
    spine: Spine
    cfiManager: CfiManager
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
          spine,
          cfiManager,
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
