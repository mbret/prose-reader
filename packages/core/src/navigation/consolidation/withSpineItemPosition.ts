import { type Observable, map } from "rxjs"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import type { NavigationResolver } from "../resolvers/NavigationResolver"

type Navigation = {
  navigation: InternalNavigationEntry | InternalNavigationInput
}

export const withSpineItemPosition =
  ({
    settings,
    spineItemsManager,
    spineLocator,
    navigationResolver,
  }: {
    settings: ReaderSettingsManager
    spineItemsManager: SpineItemsManager
    navigationResolver: NavigationResolver
    spineLocator: SpineLocator
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    const getPosition = (navigation: N["navigation"]) => {
      const { navigationSnapThreshold, computedPageTurnMode } = settings.values
      const spineItem = spineItemsManager.get(navigation.spineItem)

      if (!spineItem || !navigation.position) return undefined

      /**
       * - controlled mode
       * - we have navigation
       * - we update spine position from navigation
       */
      if (computedPageTurnMode === "controlled") {
        /**
         * @important
         *
         * Due to spread layout and/or LTR this part is a bit tricky.
         * It works in principe for a spread of N and any reading direction
         * since it uses begin/end concept.
         *
         * 1. We can trust the given spine item
         * 2. We get the farthest page from current position on item
         *    - forward: we take end
         *    - backward: we take begin
         * 3. We get navigable position for this page
         * 4. We get visible pages strictly for this position (no snapping)
         *    - forward: we take begin
         *    - backward: we take end
         * 5. We keep position in spine item for that page
         */
        const { endPageIndex, beginPageIndex } =
          spineLocator.getVisiblePagesFromViewportPosition({
            position: navigation.position,
            spineItem,
            threshold: navigationSnapThreshold,
            restrictToScreen: false,
          }) ?? {}

        const farthestPageIndex =
          (navigation.directionFromLastNavigation === "forward" ||
          navigation.directionFromLastNavigation === "anchor"
            ? endPageIndex
            : beginPageIndex) ?? 0

        const navigableSpinePositionForFarthestPageIndex =
          navigationResolver.getNavigationForSpineItemPage({
            pageIndex: farthestPageIndex,
            spineItemId: spineItem,
          })

        const visiblePagesAtNavigablePosition =
          spineLocator.getVisiblePagesFromViewportPosition({
            position: navigableSpinePositionForFarthestPageIndex,
            spineItem,
            threshold: 0,
            restrictToScreen: true,
          })

        const beginPageIndexForDirection =
          (navigation.directionFromLastNavigation === "forward" ||
          navigation.directionFromLastNavigation === "anchor"
            ? visiblePagesAtNavigablePosition?.beginPageIndex
            : visiblePagesAtNavigablePosition?.endPageIndex) ?? 0

        const positionInSpineItem =
          spineLocator.spineItemLocator.getSpineItemPositionFromPageIndex({
            pageIndex: beginPageIndexForDirection,
            isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
            itemLayout: spineItem.layoutPosition,
          })

        return positionInSpineItem
      }

      /**
       * - fallback
       * - we just get position in item from item
       */
      return spineLocator.getSpineItemPositionFromSpinePosition(
        navigation.position,
        spineItem,
      )
    }

    return stream.pipe(
      map(({ navigation, ...rest }) => {
        return {
          navigation: {
            ...navigation,
            positionInSpineItem: getPosition(navigation),
          },
          ...rest,
        } as N
      }),
    )
  }
