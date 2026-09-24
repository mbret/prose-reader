import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import type { InternalNavigationEntry } from "../types"

/**
 * A target naming a place goes forward to it; a position can only be guessed.
 */
export const guessDirection = ({
  position,
  previousNavigation,
  settings,
}: {
  position: SpinePosition | UnboundSpinePosition
  previousNavigation: InternalNavigationEntry
  settings: ReaderSettingsManager
}): "forward" | "backward" => {
  if (previousNavigation.spineItem === undefined) {
    return "forward"
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
