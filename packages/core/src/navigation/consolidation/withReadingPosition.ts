import { map, type Observable } from "rxjs"
import type { CfiManager } from "../../cfi"
import { PAGE_VISIBILITY_THRESHOLD } from "../../spine/Pages"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

/**
 * Where the navigation takes the reader in the text, as a cfi: what
 * restoration returns to after a relayout, and what an app saves to reopen the
 * book there.
 *
 * - A cfi the navigation named is kept as it is.
 * - Otherwise it is the first character of the page at the navigation's
 *   position, as soon as that page is laid out.
 * - Until then it is the start of the item, the only place a cfi can name in
 *   content that is not laid out. A restoration of the same navigation refines
 *   it once the layout it lands on has the page.
 *
 * A position in the text, once found, is kept for the rest of the navigation.
 * Restorations land on the page holding it; taking that page's own first
 * character instead would restore to the page before at the next relayout,
 * and every resize would walk the reader back.
 */
export const withReadingPosition =
  ({ spine, cfi }: { spine: Spine; cfi: CfiManager }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    const getPageCfi = (navigation: N["navigation"]) => {
      const spineItem = spine.spineItemsManager.get(navigation.spineItem)

      /**
       * Pages describe the latest layout only while it is current, and a page
       * has a first visible node only once its item is ready.
       */
      if (
        !spineItem ||
        !navigation.position ||
        !spine.isLayoutCurrent ||
        !spineItem.value.isReady
      )
        return undefined

      const { beginPageIndex } =
        spine.locator.getVisiblePagesFromViewportPosition({
          spineItem,
          position: navigation.position,
          threshold: PAGE_VISIBILITY_THRESHOLD,
        }) ?? {}

      const page =
        beginPageIndex === undefined
          ? undefined
          : spine.pages.fromSpineItemPageIndex(spineItem, beginPageIndex)

      return page && cfi.generateCfiForPage(spineItem.item, page)
    }

    const getItemStart = (navigation: N["navigation"]) => {
      const spineItem = spine.spineItemsManager.get(navigation.spineItem)

      return spineItem && cfi.generateRootCfi(spineItem.item)
    }

    const getReadingPosition = (navigation: N["navigation"]) => {
      const known = navigation.readingPosition ?? navigation.cfi

      if (known !== undefined && !cfi.isRootCfi(known)) return known

      return getPageCfi(navigation) ?? known ?? getItemStart(navigation)
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
              readingPosition: getReadingPosition(navigation),
            },
          }) as N,
      ),
    )
  }
