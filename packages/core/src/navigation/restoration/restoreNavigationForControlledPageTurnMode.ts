import { isParsedCfiRange, parse } from "@prose-reader/cfi"
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

/**
 * Whether a cfi points at a character of a text node, as `/4/2/1:12` does: its
 * last step has a character offset. One without points at an element.
 */
const isCharacterCfi = (cfi: string) => {
  const parsedCfi = parse(cfi)
  const lastStep = isParsedCfiRange(parsedCfi)
    ? parsedCfi.start.at(-1)?.at(-1)
    : parsedCfi.at(-1)?.at(-1)

  return lastStep?.offset !== undefined
}

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

      const cfi = navigation.anchor?.cfi

      /**
       * Restoration from the anchor: the place the navigation's target named
       * or found, or the text at the page it went to.
       *
       * A cfi that points at a character is restored after every layout. A
       * reflowable item is cut into pages by the reader, and a layout can move
       * its text from one page to another without changing its size, as a
       * smaller font that keeps its page count does.
       *
       * A cfi that points at an element is restored only once the item
       * changed: an element that starts on the page before, the page's first
       * visible node when no text starts on it, would take the reader back a
       * page after each layout.
       *
       * A cfi naming only its item names no place to return to: a stand-in's,
       * or a page's without text. It resolves to the item's start, which would
       * take a turn back into a chapter that just loaded to its first page
       * rather than its last.
       */
      if (cfi !== undefined && !cfiManager.isRootCfi(cfi)) {
        if (
          isCharacterCfi(cfi) ||
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

      return getSnappedPosition({
        navigation,
        spineItem,
        spineLocator,
        navigationResolver,
      })
    }),
  )
}
