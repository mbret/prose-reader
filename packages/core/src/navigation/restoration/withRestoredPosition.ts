import { map, type Observable, of, switchMap } from "rxjs"
import type { CfiManager } from "../../cfi"
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
    cfiManager,
  }: {
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
    context: Context
    spine: Spine
    cfiManager: CfiManager
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> =>
    stream.pipe(
      switchMap((params) => {
        const conversion = params.navigation.target
          ? navigationResolver.getNavigationForTarget(params.navigation.target)
          : undefined
        const navigation = conversion
          ? { ...params.navigation, ...conversion }
          : params.navigation
        // A newly resolved target must land on its node before geometric restoration resumes.
        if (conversion && !conversion.target) {
          return of({ ...params, navigation })
        }
        return restorePosition({
          spineLocator: spine.locator,
          navigation,
          navigationResolver,
          settings,
          spineItemsManager: spine.spineItemsManager,
          spineItemLocator: spine.locator.spineItemLocator,
          context,
          spine,
          cfiManager,
        }).pipe(
          map((restoredPosition) => ({
            ...params,
            navigation: {
              ...navigation,
              position: restoredPosition,
            },
          })),
        )
      }),
    )
