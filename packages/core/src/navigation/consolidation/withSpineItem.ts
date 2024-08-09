import { map, Observable } from "rxjs"
import { InternalNavigationInput } from "../InternalNavigator"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { NavigationResolver } from "../resolvers/NavigationResolver"
import { SpineLocator } from "../../spine/locator/SpineLocator"

type Navigation = {
  navigation: InternalNavigationInput
}

export const withSpineItem =
  ({
    settings,
    spineItemsManager,
    navigationResolver,
    spineLocator,
  }: {
    context: Context
    settings: ReaderSettingsManager
    spineItemsManager: SpineItemsManager
    navigationResolver: NavigationResolver
    spineLocator: SpineLocator
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    const getSpineItem = (navigation: InternalNavigationInput) => {
      const {
        position,
        spineItem,
        cfi,
        directionFromLastNavigation: direction,
      } = navigation
      const { navigationSnapThreshold, computedPageTurnMode } =
        settings.settings

      /**
       * - valid given spine item
       */
      if (spineItem !== undefined) {
        const existingSpineItem = spineItemsManager.get(spineItem)

        if (existingSpineItem) return existingSpineItem
      }

      /**
       * - invalid spine item given
       * - number too high
       * - number too low
       */
      if (typeof spineItem === "number") {
        if (spineItem > spineItemsManager.getLength() - 1) {
          return spineItemsManager.get(spineItemsManager.getLength() - 1)
        }

        return spineItemsManager.get(0)
      }

      /**
       * - cfi given
       * - we can grab safely the item
       */
      if (cfi) {
        const existingSpineItem = spineItemsManager.getSpineItemFromCfi(cfi)

        if (existingSpineItem) return existingSpineItem
      }

      /**
       * - controlled mode
       * - we have a position
       * - we retrieve the item that correspond the closest to the position
       */
      if (position && computedPageTurnMode === "controlled") {
        /**
         * @important
         *
         * Due to spread layout and/or LTR this part is a bit tricky.
         * It works in principe for a spread of N and any reading direction
         * since it uses begin/end concept.
         *
         * 1. We check the farthest visible spine item for the given navigation
         * 2. We check the farthest visible page for the item
         * 3. We retrieve the farthest navigable position.
         *
         * From that point we have the farthest navigable valid position for a given
         * navigation. (remember given navigation is not trustable). We will use this
         * navigation to lookup correctly the item
         *
         * 4. We lookup from the navigation the begin item (forward) or the end item (backward).
         */
        const { beginIndex, endIndex } =
          spineLocator.getVisibleSpineItemsFromPosition({
            position,
            threshold: navigationSnapThreshold,
            restrictToScreen: false,
          }) ?? {}

        const farthestSpineItemIndex =
          (direction === "forward" || direction === "anchor"
            ? endIndex
            : beginIndex) ?? beginIndex

        const farthestSpineItem = spineItemsManager.get(farthestSpineItemIndex)

        if (!farthestSpineItem) return undefined

        const { endPageIndex, beginPageIndex } =
          spineLocator.getVisiblePagesFromViewportPosition({
            position,
            spineItem: farthestSpineItem,
            threshold: navigationSnapThreshold,
            restrictToScreen: false,
          }) ?? {}

        const farthestVisiblePageIndex =
          (direction === "forward" || direction === "anchor"
            ? endPageIndex
            : beginPageIndex) ?? 0

        const navigationForPosition =
          navigationResolver.getNavigationForSpineItemPage({
            pageIndex: farthestVisiblePageIndex,
            spineItemId: farthestSpineItem,
          })

        const visibleSpineItemsFromNavigablePosition =
          spineLocator.getVisibleSpineItemsFromPosition({
            position: navigationForPosition,
            threshold: navigationSnapThreshold,
            restrictToScreen: false,
          })

        const finalSpineItemIndex =
          direction === "forward" || direction === "anchor"
            ? visibleSpineItemsFromNavigablePosition?.beginIndex
            : visibleSpineItemsFromNavigablePosition?.endIndex

        return spineItemsManager.get(finalSpineItemIndex)
      }

      /**
       * - scrollable content
       * - we have position
       * - we just pick the right item
       */
      if (position && computedPageTurnMode === "scrollable") {
        return spineLocator.getSpineItemFromPosition(position)
      }

      return spineItemsManager.get(0)
    }

    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItem = getSpineItem(navigation)

        return {
          navigation: {
            ...navigation,
            spineItem: spineItemsManager.getSpineItemIndex(spineItem),
          },
          ...rest,
        } as N
      }),
    )
  }
