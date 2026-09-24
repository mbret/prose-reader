import type { CfiManager } from "../../cfi"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { NavigationTargetValues, NavigationVisibleArea } from "../types"
import { guessDirection } from "./guessDirection"
import type { NavigationTargetResolvers } from "./types"

const report = Report.namespace(`navigation/targets`)

/** A selector is the enhancer's or the app's code: one bug must not stop navigation. */
const trySelect = (
  select: NavigationTargetValues["selector"]["select"],
  document: Document,
) => {
  try {
    return select(document)
  } catch (error) {
    report.error(`A selector threw, and selects nothing`, error)

    return undefined
  }
}

export const createTargetResolvers = ({
  navigationResolver,
  cfi,
  settings,
  spineItemsManager,
  getNavigationVisibleArea,
}: {
  navigationResolver: NavigationResolver
  cfi: CfiManager
  settings: ReaderSettingsManager
  spineItemsManager: SpineItemsManager
  getNavigationVisibleArea: () => NavigationVisibleArea
}): NavigationTargetResolvers => {
  const resolvers: NavigationTargetResolvers = {
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

    selector: ({ spineItem, select }, context) => {
      const item = spineItemsManager.get(spineItem)

      if (!item)
        return { directionFromLastNavigation: "forward", isExact: false }

      const document = item.value.isLoaded
        ? item.renderer.getDocumentFrame()?.contentDocument
        : undefined
      const selected = document ? trySelect(select, document) : undefined

      // Selected, it is the cfi of what was selected. Otherwise it is the item
      // start, which names no text.
      return {
        ...resolvers.cfi(
          selected
            ? cfi.generateCfiForSpineItemPage({
                spineItem: item.item,
                pageNode: { node: selected.node, offset: selected.offset ?? 0 },
              })
            : cfi.generateRootCfi(item.item),
          context,
        ),
        isPending: !document,
      }
    },
  }

  return resolvers
}
