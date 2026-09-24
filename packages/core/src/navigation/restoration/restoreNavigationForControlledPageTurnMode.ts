import { first, map, type Observable, of } from "rxjs"
import type { CfiManager } from "../../cfi"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { SpineItemPosition } from "../../spineItem/types"
import { snapToPage } from "../consolidation/withSnappedPosition"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry } from "../types"

export const restoreNavigationForControlledPageTurnMode = ({
  spineLocator,
  navigation,
  navigationResolver,
  spineItemsManager,
  spine,
  cfiManager,
}: {
  navigation: InternalNavigationEntry
  spineLocator: SpineLocator
  navigationResolver: NavigationResolver
  spineItemsManager: SpineItemsManager
  spine: Spine
  cfiManager: CfiManager
}): Observable<SpinePosition> => {
  const spineItem = spineItemsManager.get(navigation.spineItem)

  if (!spineItem) {
    return of(new SpinePosition({ x: 0, y: 0 }))
  }

  return spineItem.isReady$.pipe(
    first(),
    map((isReady) => {
      const spineItemAbsolutePosition =
        spine.getSpineItemSpineLayoutInfo(spineItem)

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
      if (navigation.target.type === "url") {
        if (
          spineItemWidthDifference ||
          spineItemHeighDifference ||
          // when spine item is ready dimensions may have not changed but the position
          // of dom elements may have!
          (isReady && !navigation.spineItemIsReady)
        ) {
          const urlResult = navigationResolver.getNavigationForUrl(
            navigation.target.value,
          )

          if (urlResult) {
            return urlResult.position
          }
        }
      }

      const cfi = navigation.anchor

      /**
       * Restoration from the anchor: the cfi the navigation named, or the text
       * at the page it went to.
       * If the layout did not change, we should not restore from cfi since
       * we will have better accuracy from all other consolidation.
       *
       * Basically as long as the item itself did not change, we can recover from
       * consolidation. In case the item changed, we should be careful and try to
       * anchor back to cfi.
       */
      if (cfi !== undefined && !cfiManager.isRootCfi(cfi)) {
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
        const positionInSpineItemWithDifference = new SpineItemPosition({
          x:
            (navigation.positionInSpineItem?.x ?? 0) + spineItemWidthDifference,
          y:
            (navigation.positionInSpineItem?.y ?? 0) + spineItemHeighDifference,
        })

        return navigationResolver.getNavigationFromSpineItemPosition({
          spineItem,
          spineItemPosition: positionInSpineItemWithDifference,
        })
      }

      return snapToPage({
        navigation,
        spineItem,
        spineLocator,
        navigationResolver,
      })
    }),
  )
}
