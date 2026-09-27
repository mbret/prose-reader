import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import { getSpineItemProgression } from "../../pagination/progression"
import { Report } from "../../report"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
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

export const createTargetResolvers = ({
  navigationResolver,
  cfi,
  settings,
  spineItemsManager,
  // The resolvers' own `context` is the navigation's.
  context: readerContext,
  getNavigationVisibleArea,
}: {
  navigationResolver: NavigationResolver
  cfi: CfiManager
  settings: ReaderSettingsManager
  spineItemsManager: SpineItemsManager
  context: Context
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

      return {
        spineItem: spineItem.index,
        /**
         * Clamped as a requested position is: down one column, the node can
         * be in the book's last screen, where the viewport stops before it.
         */
        position: navigationResolver.clampPositionInSpine(
          navigationResolver.getNavigationForNode({
            spineItem,
            node,
            offset,
          }),
          getNavigationVisibleArea(),
        ),
        /**
         * The place the cfi names, once the item's document shows it there,
         * as for any target naming a place in a document, at the item's start
         * until its page is laid out. A cfi naming only its item names no
         * place, and resolves to no node, nor does one whose path leads to
         * nothing in the document, or into an item without one: they are
         * anchored at the page they land on. Until the item is loaded the
         * navigation's anchor stands in, and restorations resolve the cfi
         * again.
         */
        anchor: node
          ? {
              cfi: value,
              percentageEstimateOfBook: getSpineItemProgression(
                readerContext.manifest,
                spineItem.index,
              ).start,
              state: "targetPlace",
            }
          : undefined,
        directionFromLastNavigation: "forward",
        snapToPage: false,
        awaitsDocument:
          !namesOnlyItsItem && spineItem.value.loadStatus !== "loaded",
      }
    },

    selector: ({ spineItem, find }, context) => {
      const item = spineItemsManager.get(spineItem)

      // Never reached: a navigation to a selector of an item the book does not
      // have is ignored before it is resolved.
      if (!item)
        return resolvers.position(context.previousNavigation.position, context)

      const document =
        item.value.loadStatus === "loaded"
          ? item.renderer.getDocumentFrame()?.contentDocument
          : undefined
      const found = document ? tryFind(find, document) : undefined

      /**
       * Found, it is the cfi of what was found. Otherwise it is the item
       * start, which names no text. It awaits the item's document only while
       * the item loads: an item rendered without a document, such as audio,
       * never gets one, and its navigation is anchored at the page it lands
       * on instead of waiting for good.
       */
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
        awaitsDocument: item.value.loadStatus !== "loaded",
      }
    },
  }

  return resolvers
}
