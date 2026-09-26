import type { CfiManager } from "../../cfi"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { NavigationTargetValues, NavigationVisibleArea } from "../types"
import { guessDirection } from "./guessDirection"
import type { NavigationTargetResolvers } from "./types"

const report = Report.namespace(`navigation/targets`)

/** A selector is the enhancer's or the app's code: one bug must not stop navigation. */
const tryFind = (
  find: NavigationTargetValues["selector"]["find"],
  document: Document,
) => {
  try {
    return find(document)
  } catch (error) {
    report.error(`A selector threw, and finds nothing`, error)

    return undefined
  }
}

/**
 * The item's document, once it is loaded. Until then, a place in it can be
 * neither found nor ruled out. An item rendered without a document never has
 * one.
 */
const getLoadedSpineItemDocument = (spineItem: SpineItem) =>
  spineItem.value.isLoaded
    ? (spineItem.renderer.getDocumentFrame()?.contentDocument ?? undefined)
    : undefined

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
        snapToPage: true,
        awaitsDocument: false,
      }
    },

    spineItem: (spineItem) => ({
      spineItem,
      directionFromLastNavigation: "forward",
      snapToPage: true,
      awaitsDocument: false,
    }),

    cfi: (value, context) => {
      const spineItem = cfi.getSpineItemFromCfi(value)

      // Never reached: a navigation to a cfi naming nothing in the book is
      // ignored before it is resolved.
      if (!spineItem)
        return resolvers.position(context.previousNavigation.position, context)

      const { node, offset } = cfi.resolveCfi({ cfi: value })
      const namesOnlyItsItem = cfi.isRootCfi(value)
      const isDocumentLoaded =
        getLoadedSpineItemDocument(spineItem) !== undefined

      return {
        spineItem: spineItem.index,
        position: navigationResolver.getNavigationForNode({
          spineItem,
          node,
          offset,
        }),
        /**
         * The place the cfi names. A cfi naming only its item names no place,
         * and neither does one naming nothing in the item's document: both are
         * anchored at the page they land on. Until the document is loaded, a
         * cfi naming nothing cannot be told from one naming a place, so it
         * stands as asked, and restorations resolve it again.
         */
        anchor:
          namesOnlyItsItem || (isDocumentLoaded && !node) ? undefined : value,
        directionFromLastNavigation: "forward",
        snapToPage: false,
        awaitsDocument: !namesOnlyItsItem && !isDocumentLoaded,
      }
    },

    selector: ({ spineItem, find }, context) => {
      const item = spineItemsManager.get(spineItem)

      // Never reached: a navigation to a selector of an item the book does not
      // have is ignored before it is resolved.
      if (!item)
        return resolvers.position(context.previousNavigation.position, context)

      const document = getLoadedSpineItemDocument(item)
      const found = document ? tryFind(find, document) : undefined

      // Found, it is the cfi of what was found. Otherwise it is the item
      // start, which names no text.
      return {
        ...resolvers.cfi(
          found
            ? cfi.generateCfiForSpineItemPage({
                spineItem: item.item,
                pageNode: { node: found.node, offset: found.offset ?? 0 },
              })
            : cfi.generateRootCfi(item.item),
          context,
        ),
        awaitsDocument: !document,
      }
    },
  }

  return resolvers
}
