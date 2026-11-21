import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager.ts"
import type { SpineLocator } from "../../spine/locator/SpineLocator.ts"
import type { SpineItemsManager } from "../../spine/SpineItemsManager.ts"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types.ts"
import type { InternalNavigationEntry } from "../types.ts"

/**
 * A target naming a place goes forward to it; a position can only be guessed.
 */
export const guessDirection = ({
  position,
  previousNavigation,
  settings,
  spineItemsManager,
  spineLocator,
}: {
  position: SpinePosition | UnboundSpinePosition
  previousNavigation: InternalNavigationEntry
  settings: ReaderSettingsManager
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
}): "forward" | "backward" => {
  if (previousNavigation.spineItem === undefined) {
    return "forward"
  }

  /**
   * In a book that scrolls, the direction says which end of its spine item
   * the reader came in by: forward from a spine item before it, backward from
   * one after it. A position in the spine item of the previous navigation
   * keeps that navigation's direction. The user's scroll navigates at each
   * move, and a move can go a little the other way: the reader is still in
   * the spine item it came into by the same end.
   */
  if (settings.values.computedPageTurnMode === "scrollable") {
    const spineItemIndex = spineItemsManager.getSpineItemIndex(
      spineLocator.getSpineItemFromPosition(position),
    )
    const previousSpineItemIndex = spineItemsManager.getSpineItemIndex(
      previousNavigation.spineItem,
    )

    if (
      spineItemIndex === undefined ||
      previousSpineItemIndex === undefined ||
      spineItemIndex === previousSpineItemIndex
    ) {
      return previousNavigation.directionFromLastNavigation ?? "forward"
    }

    return spineItemIndex > previousSpineItemIndex ? "forward" : "backward"
  }

  if (settings.values.computedPageTurnDirection === "vertical") {
    if (position.y > previousNavigation.position.y) {
      return "forward"
    }

    if (
      position.y === previousNavigation.position.y &&
      previousNavigation.directionFromLastNavigation !== "backward"
    ) {
      return "forward"
    }

    return "backward"
  }

  if (Math.abs(position.x) > Math.abs(previousNavigation.position.x)) {
    return "forward"
  }

  if (
    position.x === previousNavigation.position.x &&
    previousNavigation.directionFromLastNavigation !== "backward"
  ) {
    return "forward"
  }

  return "backward"
}
