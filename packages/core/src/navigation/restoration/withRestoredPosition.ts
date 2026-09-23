import { map, type Observable, switchMap, withLatestFrom } from "rxjs"
import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry, NavigationAnchor } from "../types"
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
    anchor$,
  }: {
    navigationResolver: NavigationResolver
    settings: ReaderSettingsManager
    context: Context
    spine: Spine
    cfiManager: CfiManager
    /** The latest navigation anchor, which replays the current one. */
    anchor$: Observable<NavigationAnchor | undefined>
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> =>
    stream.pipe(
      withLatestFrom(anchor$),
      switchMap(([params, anchor]) => {
        return restorePosition({
          spineLocator: spine.locator,
          navigation: params.navigation,
          // Only this navigation's own anchor: another's is another page.
          anchorCfi:
            anchor?.id === params.navigation.id ? anchor.cfi : undefined,
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
              ...params.navigation,
              position: restoredPosition,
            },
          })),
        )
      }),
    )
