import { map, type Observable } from "rxjs"
import type { CfiManager } from "../../cfi"
import { PAGE_VISIBILITY_THRESHOLD } from "../../spine/Pages"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

/**
 * The navigation's anchor: where it takes the reader in the text, as a cfi.
 * Restoration returns to it after a relayout, and the reader exposes it as its
 * reading position.
 *
 * - A cfi the navigation named is kept as it is, unless it names only an item.
 * - Otherwise it is the first character of the page that shows first at the
 *   navigation's position, the begin edge of what is visible, as soon as that
 *   page is laid out.
 * - Until then the navigation has none, and restoration works from its
 *   position. The first restoration that lands on a layout with the page
 *   finds it.
 *
 * Once found it is kept for the rest of the navigation. Restorations land on
 * the page holding it; taking that page's own first character instead would
 * restore to the page before at the next relayout, and every resize would walk
 * the reader back.
 */
export const withAnchor =
  ({ spine, cfi }: { spine: Spine; cfi: CfiManager }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    const getPageCfi = ({ position }: N["navigation"]) => {
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

      return page && cfi.generateCfiForPage(spineItem.item, page)
    }

    const getAnchor = (navigation: N["navigation"]) => {
      if (navigation.anchor !== undefined) return navigation.anchor

      const { target } = navigation

      if (target.type === "cfi" && !cfi.isRootCfi(target.value))
        return target.value

      return getPageCfi(navigation)
    }

    return stream.pipe(
      map(
        ({ navigation, ...rest }) =>
          // Only a field is added, so the caller's shape still holds, as for
          // the other consolidation steps.
          ({
            ...rest,
            navigation: {
              ...navigation,
              anchor: getAnchor(navigation),
            },
          }) as N,
      ),
    )
  }
