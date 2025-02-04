import { first, map, of } from "rxjs"
import { isRootCfi } from "../../cfi/lookup/isRootCfi"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineLayout } from "../../spine/SpineLayout"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { InternalNavigationEntry } from "../InternalNavigator"
import type { NavigationResolver } from "../resolvers/NavigationResolver"

export const restoreNavigationForControlledPageTurnMode = ({
  spineLocator,
  navigation,
  navigationResolver,
  spineItemsManager,
  spineLayout,
}: {
  navigation: InternalNavigationEntry
  spineLocator: SpineLocator
  navigationResolver: NavigationResolver
  spineItemsManager: SpineItemsManager
  spineLayout: SpineLayout
}) => {
  const spineItem = spineItemsManager.get(navigation.spineItem)

  if (!spineItem) {
    return of({ x: 0, y: 0 })
  }

  return spineItem.isReady$.pipe(
    first(),
    map((isReady) => {
      const spineItemAbsolutePosition =
        spineLayout.getAbsolutePositionOf(spineItem)

      const isPositionWithinSpineItem = spineLocator.isPositionWithinSpineItem(
        navigation.position,
        spineItem,
      )

      const spineItemWidthDifference =
        spineItemAbsolutePosition.width - (navigation.spineItemWidth ?? 0)
      const spineItemHeighDifference =
        spineItemAbsolutePosition.height - (navigation.spineItemHeight ?? 0)

      const hasSpineItemGrewOrShrink =
        spineItemWidthDifference !== 0 || spineItemHeighDifference !== 0

      /**
       * Url navigation has higher priority together with CFI, we should
       * restore from it first.
       *
       * If the layout did not change, we should not restore from cfi since
       * we will have better accuracy from all other consolidation.
       *
       * Basically as long as the item itself did not change, we can recover from
       * consolidation. In case the item changed, we should be careful and try to
       * anchor back to cfi.
       */
      if (navigation.url !== undefined) {
        if (
          spineItemWidthDifference ||
          spineItemHeighDifference ||
          // when spine item is ready dimensions may have not changed but the position
          // of dom elements may have!
          (isReady && !navigation.spineItemIsReady)
        ) {
          const urlResult = navigationResolver.getNavigationForUrl(
            navigation.url,
          )

          if (urlResult) {
            return urlResult.position
          }
        }
      }

      const cfi = navigation.cfi ?? navigation.paginationBeginCfi

      /**
       * Restoration from cfi.
       * If the layout did not change, we should not restore from cfi since
       * we will have better accuracy from all other consolidation.
       *
       * Basically as long as the item itself did not change, we can recover from
       * consolidation. In case the item changed, we should be careful and try to
       * anchor back to cfi.
       */
      if (cfi !== undefined && !isRootCfi(cfi)) {
        if (
          spineItemWidthDifference ||
          spineItemHeighDifference ||
          // when spine item is ready dimensions may have not changed but the position
          // of dom elements may have!
          (isReady && !navigation.spineItemIsReady)
        ) {
          const cfiResultPosition = navigationResolver.getNavigationForCfi(cfi)

          if (cfiResultPosition) {
            return cfiResultPosition
          }
        }
      }

      if (
        isPositionWithinSpineItem &&
        hasSpineItemGrewOrShrink &&
        navigation.directionFromLastNavigation === "backward"
      ) {
        const positionInSpineItemWithDifference = {
          x:
            (navigation.positionInSpineItem?.x ?? 0) + spineItemWidthDifference,
          y:
            (navigation.positionInSpineItem?.y ?? 0) + spineItemHeighDifference,
        }

        return navigationResolver.getNavigationFromSpineItemPosition({
          spineItem,
          spineItemPosition: positionInSpineItemWithDifference,
        })
      }

      /**
       * - position in spine item known
       * - dimensions of item known
       * - we can retrieve the desired page index
       * - we get navigation for same page on current item
       */
      if (
        navigation.positionInSpineItem &&
        navigation.spineItemHeight &&
        navigation.spineItemWidth
      ) {
        const pageIndex =
          spineLocator.spineItemLocator.getSpineItemPageIndexFromPosition({
            itemWidth: navigation.spineItemWidth,
            itemHeight: navigation.spineItemHeight,
            isUsingVerticalWriting:
              !!navigation.spineItemIsUsingVerticalWriting,
            position: navigation.positionInSpineItem,
          })

        return navigationResolver.getNavigationForSpineItemPage({
          pageIndex,
          spineItemId: spineItem,
        })
      }

      /**
       * - position is within spine item
       * - position is somewhat trustable
       * - we will retrieve the closest valid navigation
       */
      if (isPositionWithinSpineItem) {
        return navigationResolver.getNavigationForPosition(navigation.position)
      }

      /**
       * - position is not within spine item
       * - position is not trustable
       * - fallback to default navigation for spine item
       */
      return navigationResolver.getNavigationForSpineIndexOrId(spineItem)
    }),
  )
}
