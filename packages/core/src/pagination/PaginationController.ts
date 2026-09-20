import {
  filter,
  map,
  merge,
  type Observable,
  share,
  switchMap,
  take,
  takeUntil,
  withLatestFrom,
} from "rxjs"
import type { CfiManager } from "../cfi"
import type { Context } from "../context/Context"
import type { Navigation } from "../navigation/types"
import type { PageEntry } from "../spine/Pages"
import type { Spine } from "../spine/Spine"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import type { SpineItem } from "../spineItem/SpineItem"
import { DestroyableClass } from "../utils/DestroyableClass"
import { waitForSwitch } from "../utils/rxjs"
import type { Pagination } from "./Pagination"
import type { PaginationInfo } from "./types"

const VISIBILITY_THRESHOLD: { type: "percentage"; value: number } = {
  type: "percentage",
  value: 0.5,
}

export class PaginationController extends DestroyableClass {
  constructor(
    protected context: Context,
    protected pagination: Pagination,
    protected spineItemsManager: SpineItemsManager,
    protected spine: Spine,
    protected isNavigationLocked$: Observable<boolean>,
    protected cfi: CfiManager,
  ) {
    super()

    /**
     * Results are produced by the pipeline rather than written into the
     * entity from side effects, but the stream shape is kept as it was: the
     * metrics pass feeds the positions pass, and both publish.
     *
     * `share()` is what removes the duplicated work. Previously the two were
     * subscribed separately, and the metrics chain is cold, so its visible
     * item and page lookups ran once per subscriber.
     */
    const metrics$ = merge(
      this.context.bridgeEvent.navigation$,
      spine.layout$,
    ).pipe(
      switchMap(() =>
        /**
         * @important
         *
         * Metrics are resolved immediately so user feedback (navigation
         * buttons) is not delayed. Nothing there is heavier than a layout
         * lookup.
         *
         * We wait for the navigator to be unlocked first, which avoids
         * resolving while the user is panning for example. A locked navigator
         * is an unfinished navigation.
         */
        this.isNavigationLocked$.pipe(
          filter((isLocked) => !isLocked),
          take(1),
          withLatestFrom(this.context.bridgeEvent.navigation$),
          map(([, navigation]) => {
            /**
             * When the visible items cannot be resolved, the previous result
             * is carried through unchanged. That keeps the behaviour this
             * refactor found: the positions pass used to run in this case too,
             * against whatever the entity already held.
             */
            return this.resolveMetrics(navigation) ?? this.pagination.value
          }),
        ),
      ),
      share(),
    )

    /**
     * Heavy operation, needs to be optimized as much as possible.
     *
     * @todo add more optimization, comparing item before, after with position,
     * etc
     */
    const positions$ = metrics$.pipe(
      waitForSwitch(this.context.bridgeEvent.viewportFree$),
      map((metrics) => this.resolvePositions(metrics)),
      filter((result): result is PaginationInfo => result !== undefined),
    )

    merge(metrics$, positions$)
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.pagination.update(result)
      })
  }

  private getVisiblePages(
    spineItem: SpineItem,
    position: SpinePosition | UnboundSpinePosition,
  ) {
    return this.spine.locator.getVisiblePagesFromViewportPosition({
      spineItem,
      position,
      threshold: VISIBILITY_THRESHOLD,
    })
  }

  /**
   * Cheap pass: which items and pages are visible. Positions are carried over
   * from the previous result, or fall back to the item start, and are only
   * resolved properly by {@link resolvePositions}.
   */
  private resolveMetrics(navigation: Navigation): PaginationInfo | undefined {
    const { position } = navigation
    const previous = this.pagination.value

    const { beginIndex: beginSpineItemIndex, endIndex: endSpineItemIndex } =
      this.spine.locator.getVisibleSpineItemsFromPosition({
        position,
        threshold: VISIBILITY_THRESHOLD,
      }) ?? {}

    const beginSpineItem = this.spineItemsManager.get(beginSpineItemIndex)
    const endSpineItem = this.spineItemsManager.get(endSpineItemIndex)

    if (!beginSpineItem || !endSpineItem) return undefined

    const { beginPageIndex = 0 } =
      this.getVisiblePages(beginSpineItem, position) ?? {}
    const { endPageIndex = 0 } =
      this.getVisiblePages(endSpineItem, position) ?? {}

    const beginLastCfi = previous.beginCfi
    const endLastCfi = previous.endCfi

    /**
     * A carried over cfi is only replaced if it cannot describe this result:
     * it is missing, it is a root target, or the item changed.
     */
    const shouldUpdateBeginCfi =
      beginLastCfi === undefined ||
      this.cfi.isRootCfi(beginLastCfi) ||
      previous.beginSpineItemIndex !== beginSpineItemIndex

    const shouldUpdateEndCfi =
      previous.endSpineItemIndex !== endSpineItemIndex ||
      endLastCfi === undefined ||
      this.cfi.isRootCfi(endLastCfi)

    return {
      beginCfi: shouldUpdateBeginCfi
        ? this.cfi.generateRootCfi(beginSpineItem.item)
        : beginLastCfi,
      beginNumberOfPagesInSpineItem: beginSpineItem.numberOfPages,
      beginPageIndexInSpineItem: beginPageIndex,
      beginSpineItemIndex,
      endCfi: shouldUpdateEndCfi
        ? this.cfi.generateRootCfi(endSpineItem.item)
        : endLastCfi,
      endNumberOfPagesInSpineItem: endSpineItem.numberOfPages,
      endPageIndexInSpineItem: endPageIndex,
      endSpineItemIndex,
      navigationId: navigation.id,
    }
  }

  /**
   * Resolves the positions of the metrics it is given, rather than of whatever
   * the reader happens to hold by the time the viewport frees up.
   */
  private resolvePositions(
    metrics: PaginationInfo,
  ): PaginationInfo | undefined {
    const {
      beginSpineItemIndex,
      endSpineItemIndex,
      beginPageIndexInSpineItem,
      endPageIndexInSpineItem,
    } = metrics

    if (
      beginPageIndexInSpineItem === undefined ||
      endPageIndexInSpineItem === undefined ||
      beginSpineItemIndex === undefined ||
      endSpineItemIndex === undefined
    )
      return undefined

    const beginSpineItem = this.spineItemsManager.get(beginSpineItemIndex)
    const endSpineItem = this.spineItemsManager.get(endSpineItemIndex)

    if (!beginSpineItem || !endSpineItem) return undefined

    const beginPageEntry = this.spine.pages.fromSpineItemPageIndex(
      beginSpineItem,
      beginPageIndexInSpineItem,
    )
    const endPageEntry = this.spine.pages.fromSpineItemPageIndex(
      endSpineItem,
      endPageIndexInSpineItem,
    )

    // @todo only update long cfi if the item layout change but specifically its content
    return {
      ...metrics,
      beginCfi: this.resolveCfi(beginSpineItem, beginPageEntry),
      endCfi: this.resolveCfi(endSpineItem, endPageEntry),
    }
  }

  /**
   * The cfi of a page, falling back to the item itself when the page has no
   * resolvable first visible node.
   */
  private resolveCfi(spineItem: SpineItem, pageEntry: PageEntry | undefined) {
    return pageEntry?.firstVisibleNode
      ? this.cfi.generateCfiForSpineItemPage({
          spineItem: spineItem.item,
          pageNode: pageEntry.firstVisibleNode,
        })
      : this.cfi.generateRootCfi(spineItem.item)
  }
}
