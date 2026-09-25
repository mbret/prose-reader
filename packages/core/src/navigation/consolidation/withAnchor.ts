import { map, type Observable } from "rxjs"
import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import { getPageStartProgression } from "../../manifest/progression"
import { PAGE_VISIBILITY_THRESHOLD } from "../../spine/Pages"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
  awaitsDocument: boolean
}

/**
 * The navigation's anchor: where it takes the reader in the text, as a cfi,
 * and how far into the book the page holding it starts. Restoration returns
 * to it after a relayout, and the reader exposes it as its reading position.
 *
 * - A target that names a place in the text, a cfi or what a selector found,
 *   comes with it: its resolver sets it, and this step keeps it.
 * - Otherwise it is the first character of the page that shows first at the
 *   navigation's position, the begin edge of what is visible, as soon as that
 *   page is laid out.
 * - Until then the navigation has none, and restoration works from its
 *   position. The first restoration that lands on a layout with the page
 *   finds it.
 * - While the target awaits its document it has none either: the page at its
 *   position can belong to another item, and would stop the target from being
 *   resolved again.
 *
 * The progression is that same page's, so it is found with the anchor, or,
 * for a target's anchor, once the page holding it is laid out.
 *
 * Once found both are kept for the rest of the navigation. Restorations land
 * on the page holding the anchor; taking that page's own first character
 * instead would restore to the page before at the next relayout, and every
 * resize would walk the reader back.
 */
export const withAnchor =
  ({
    spine,
    cfi,
    context,
  }: {
    spine: Spine
    cfi: CfiManager
    context: Context
  }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    const getAnchorPage = ({ position }: N["navigation"]) => {
      if (!position) return undefined

      /**
       * The item that shows first, as pagination picks its begin edge. The
       * navigation's own item can be a sliver at the top of a scrolled
       * viewport, with no page of it visible enough to count.
       */
      const { beginIndex } =
        spine.locator.getVisibleSpineItemsFromPosition({
          position,
          threshold: PAGE_VISIBILITY_THRESHOLD,
        }) ?? {}
      const spineItem = spine.spineItemsManager.get(beginIndex)

      /**
       * Pages describe the latest layout only while it is current, and a page
       * has a first visible node only once its item is ready.
       */
      if (!spineItem || !spine.isLayoutCurrent || !spineItem.value.isReady)
        return undefined

      const { beginPageIndex } =
        spine.locator.getVisiblePagesFromViewportPosition({
          spineItem,
          position,
          threshold: PAGE_VISIBILITY_THRESHOLD,
        }) ?? {}

      const page =
        beginPageIndex === undefined
          ? undefined
          : spine.pages.fromSpineItemPageIndex(spineItem, beginPageIndex)

      return page && { spineItem, page }
    }

    const getAnchor = (
      navigation: N["navigation"],
      awaitsDocument: N["awaitsDocument"],
    ) => {
      const hasAnchorWithPageStartProgression =
        navigation.anchor !== undefined &&
        navigation.anchorPageStartProgression !== undefined
      const anchorPage =
        hasAnchorWithPageStartProgression || awaitsDocument
          ? undefined
          : getAnchorPage(navigation)

      return {
        anchor:
          navigation.anchor ??
          (anchorPage &&
            cfi.generateCfiForPage(anchorPage.spineItem.item, anchorPage.page)),
        anchorPageStartProgression:
          navigation.anchorPageStartProgression ??
          (anchorPage &&
            getPageStartProgression({
              manifest: context.manifest,
              spineItemIndex: anchorPage.spineItem.index,
              pageIndex: anchorPage.page.pageIndex,
              numberOfPages: anchorPage.spineItem.numberOfPages,
            })),
      }
    }

    return stream.pipe(
      map(
        ({ navigation, ...rest }) =>
          // Only fields are added, so the caller's shape still holds, as for
          // the other consolidation steps.
          ({
            ...rest,
            navigation: {
              ...navigation,
              ...getAnchor(navigation, rest.awaitsDocument),
            },
          }) as N,
      ),
    )
  }
