import { map, type Observable } from "rxjs"
import type { CfiManager } from "../../cfi"
import type { Context } from "../../context/Context"
import {
  getPageStartProgression,
  getSpineItemProgression,
} from "../../pagination/progression"
import { PAGE_VISIBILITY_THRESHOLD } from "../../spine/Pages"
import type { Spine } from "../../spine/Spine"
import type { SpineItem } from "../../spineItem/SpineItem"
import type {
  InternalNavigationAnchor,
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../types"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
  awaitsDocument: boolean
} & (
  | {
      awaitsLockRelease: boolean
      previousNavigation: InternalNavigationEntry
    }
  // A restoration waits for the lock to be released.
  | { awaitsLockRelease?: never }
)

/**
 * The navigation's anchor: where it takes the reader in the text, as a cfi,
 * and how far into the book that is, refined as the reader finds out. The
 * reader exposes it as its reading position, and restoration returns to it
 * after a relayout once it is a place.
 *
 * - A target that names a place in the text, a cfi or what a selector found,
 *   comes with it once its document shows the place: its resolver sets it,
 *   and this step makes it final once the page holding it is laid out. That
 *   page is not the one at the navigation's position, which is a spread's
 *   first page while the anchor can be on the second.
 * - Otherwise it is the first character of the page that shows first at the
 *   navigation's position, the begin edge of what is visible, final as soon
 *   as that page is laid out. That includes a target whose document shows it
 *   names nothing.
 * - Until then it stands in: the start of the item the navigation goes to.
 *   Restoration works from the navigation's position, and the first
 *   restoration that lands on a layout with the page finds it.
 * - While the target awaits its document it stands in too: the page at its
 *   position can belong to another item, and a final anchor would stop the
 *   target from being resolved again.
 * - While `lock()` is held, as by a pan, the navigation is unfinished: its
 *   position is the lock holder's, and the page that shows the most there
 *   need not be the one it lands on once released, which can snap to the
 *   next page before that one shows the most. It keeps the anchor of the
 *   navigation it replaces, where the reader still is as far as it knows;
 *   the release finds its own.
 * - Once the item the navigation goes to has failed to load, no page of it
 *   can be found: the anchor ends in error, where it stood in or at the
 *   target's place. A failed load lays the spine out, which restores the
 *   navigation, so this step sees it.
 *
 * A final anchor, or one in error, is kept for the rest of the navigation.
 * Restorations land on the page holding a final one; taking that page's own
 * first character instead would restore to the page before at the next
 * relayout, and every resize would walk the reader back.
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
    const getPageAtNavigationPosition = ({ position }: N["navigation"]) => {
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
       * The pages describe the item as the reader last laid it out, and still
       * do while a pending layout can only change items after it, as a later
       * item loading does. A page has a first visible node only once its item
       * is ready.
       */
      if (
        !spineItem ||
        !spine.isLayoutCurrentFor(spineItem) ||
        !spineItem.value.isReady
      )
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

    /**
     * The page holding a target's anchor, resolved from the anchor itself,
     * once its item is ready on a current layout. Its item is the one
     * resolving the cfi gives, which an enhancer can map onto another. Every
     * node has a page, one that isn't rendered that of the content after it.
     */
    const getPageHoldingTargetAnchor = (anchorCfi: string) => {
      const { node, offset, spineItem } = cfi.resolveCfi({ cfi: anchorCfi })

      /**
       * The page holding a node is measured in the item's document as it is
       * now, which any pending layout lays out again, even one that cannot
       * change it, so it waits for no layout to be pending.
       */
      if (!spineItem || !spine.isLayoutCurrent || !spineItem.value.isReady)
        return undefined

      const pageIndex = node
        ? spine.locator.spineItemLocator.getSpineItemPageIndexFromNode(
            node,
            offset ?? 0,
            spineItem,
          )
        : 0

      return { spineItem, pageIndex }
    }

    const getAnchorPageStartProgression = ({
      spineItem,
      pageIndex,
    }: {
      spineItem: SpineItem
      pageIndex: number
    }) =>
      getPageStartProgression({
        manifest: context.manifest,
        spineItemIndex: spineItem.index,
        pageIndex,
        numberOfPages: spineItem.numberOfPages,
      })

    /**
     * The start of the item the navigation goes to, while no place is known.
     * A navigation without a spine item goes nowhere yet, and has no anchor.
     */
    const getStandInAnchor = (
      navigation: N["navigation"],
    ): InternalNavigationAnchor | undefined => {
      const spineItem = spine.spineItemsManager.get(navigation.spineItem)

      if (!spineItem) return undefined

      return {
        cfi: cfi.generateRootCfi(spineItem.item),
        percentageEstimateOfBook: getSpineItemProgression(
          context.manifest,
          spineItem.index,
        ).start,
        state: "standIn",
      }
    }

    /**
     * An anchor whose page is not found yet, in error once the item the
     * navigation goes to has failed to load: none of its pages ever will be.
     */
    const endInErrorOnLoadFailure = (
      anchor: InternalNavigationAnchor | undefined,
      navigation: N["navigation"],
    ): InternalNavigationAnchor | undefined =>
      anchor && spine.spineItemsManager.get(navigation.spineItem)?.value.isError
        ? { ...anchor, state: "error" }
        : anchor

    const getAnchor = (
      navigation: N["navigation"],
      awaitsDocument: N["awaitsDocument"],
    ): InternalNavigationAnchor | undefined => {
      const { anchor } = navigation

      if (anchor?.state === "final" || anchor?.state === "error") return anchor

      if (anchor?.state === "targetPlace") {
        const targetPlacePage = getPageHoldingTargetAnchor(anchor.cfi)

        return targetPlacePage
          ? {
              cfi: anchor.cfi,
              percentageEstimateOfBook:
                getAnchorPageStartProgression(targetPlacePage),
              state: "final",
            }
          : endInErrorOnLoadFailure(anchor, navigation)
      }

      const page = awaitsDocument
        ? undefined
        : getPageAtNavigationPosition(navigation)

      if (!page)
        return endInErrorOnLoadFailure(getStandInAnchor(navigation), navigation)

      return {
        cfi: cfi.generateCfiForPage(page.spineItem.item, page.page),
        percentageEstimateOfBook: getAnchorPageStartProgression({
          spineItem: page.spineItem,
          pageIndex: page.page.pageIndex,
        }),
        state: "final",
      }
    }

    return stream.pipe(
      map(
        (params) =>
          // Only the anchor is set, so the caller's shape still holds, as for
          // the other consolidation steps.
          ({
            ...params,
            navigation: {
              ...params.navigation,
              anchor: params.awaitsLockRelease
                ? params.previousNavigation.anchor
                : getAnchor(params.navigation, params.awaitsDocument),
            },
          }) as N,
      ),
    )
  }
