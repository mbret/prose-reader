import type { CfiManager } from "../../cfi"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { NavigationVisibleArea } from "../types"
import { guessDirection } from "./guessDirection"
import type { NavigationTargetResolvers } from "./types"

export const createTargetResolvers = ({
  navigationResolver,
  cfi,
  settings,
  getNavigationVisibleArea,
}: {
  navigationResolver: NavigationResolver
  cfi: CfiManager
  settings: ReaderSettingsManager
  getNavigationVisibleArea: () => NavigationVisibleArea
}): NavigationTargetResolvers => ({
  position: (requestedPosition, { previousNavigation }) => {
    const requestedVisibleArea = getNavigationVisibleArea()
    // Clamp the full viewport rectangle, not just the top-left point:
    // a point-only clamp lets the viewport spill past the end by
    // `~viewportSize` and the stored position diverges from where the
    // DOM scroll actually lands in scrollable mode.
    const position = navigationResolver.clampPositionInSpine(
      requestedPosition,
      requestedVisibleArea,
    )

    return {
      position,
      requestedPosition,
      requestedVisibleArea,
      directionFromLastNavigation: guessDirection({
        position,
        previousNavigation,
        settings,
      }),
      isExact: false,
    }
  },

  spineItem: (spineItem) => ({
    spineItem,
    directionFromLastNavigation: "forward",
    isExact: false,
  }),

  cfi: (value) => {
    if (!value)
      return { directionFromLastNavigation: "forward", isExact: false }

    return {
      spineItem: cfi.getSpineItemFromCfi(value)?.index,
      position: navigationResolver.getNavigationForCfi(value),
      // A cfi naming only an item is anchored at the page it lands on.
      anchor: cfi.isRootCfi(value) ? undefined : value,
      directionFromLastNavigation: "forward",
      isExact: true,
    }
  },

  url: (value) => {
    if (!value)
      return { directionFromLastNavigation: "forward", isExact: false }

    const result = navigationResolver.getNavigationForUrl(value)

    return {
      spineItem: result?.spineItemId,
      position: result?.position,
      directionFromLastNavigation: "forward",
      isExact: true,
    }
  },
})
