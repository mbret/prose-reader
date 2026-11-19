import { map, type Observable, switchMap } from "rxjs"
import type { CfiManager } from "../../cfi/index.ts"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager.ts"
import type { Spine } from "../../spine/Spine.ts"
import type { NavigationResolver } from "../resolvers/NavigationResolver.ts"
import type { InternalNavigationEntry } from "../types.ts"
import { restorePosition } from "./restorePosition.ts"

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
