import { first, map, type Observable, of } from "rxjs"
import type { CfiManager } from "../../cfi"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { SpineItemPosition } from "../../spineItem/types"
import { getSnappedPosition } from "../consolidation/withSnappedPosition"
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
       * The item's size changed, or its document became ready, which can move
       * its elements without changing its size, since the navigation.
       */
      const hasSpineItemResizedOrBecameReady =
        hasSpineItemGrewOrShrink || (isReady && !navigation.spineItemIsReady)

      /**
       * Whether the reader can tell which page of this item a node is on. In
       * vertical writing it knows no page but the first. Right to left, it
       * measures the node's text as one box, whose left edge is on the last
       * page that text reaches.
       */
      const canFindPageOfNode =
        !spineItem.isUsingVerticalWriting() &&
        spineItem.readingDirection === "ltr"

      const { anchor } = navigation

      /**
       * Restoration from the anchor: the place the navigation's target named,
       * or the start of the page it went to.
       *
       * While the item's document is ready, the anchor is resolved after every
       * layout. A layout can move a reflowable item's text to another page and
       * keep the item's size, as a smaller font that keeps the page count does.
       *
       * In two cases the anchor is resolved only once the item resized or
       * became ready:
       * - An anchor that is an element of the page can start on an earlier
       *   page. Resolving it after every layout would take the reader back to
       *   that page.
       * - In an item where the reader cannot tell a node's page, resolving the
       *   anchor would take the reader to another page.
       *
       * A cfi naming only its item names no place to return to: a stand-in's,
       * or a page's that shows no node. It resolves to the item's start, which
       * would take a turn back into a chapter that just loaded to its first
       * page rather than its last.
       */
      if (
        anchor &&
        !cfiManager.isRootCfi(anchor.cfi) &&
        ((isReady && canFindPageOfNode && !anchor.isPageElement) ||
          hasSpineItemResizedOrBecameReady)
      ) {
        const cfiResultPosition = navigationResolver.getNavigationForCfi(
          anchor.cfi,
        )

        if (cfiResultPosition) {
          return cfiResultPosition
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

      return getSnappedPosition({
        navigation,
        spineItem,
        spineLocator,
        navigationResolver,
      })
    }),
  )
}
