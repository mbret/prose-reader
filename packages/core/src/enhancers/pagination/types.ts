import type { Observable } from "rxjs"
import type { PaginationEdge, VisibleRange } from "../../pagination/types"
import type { LayoutEnhancerOutput } from "../layout/layoutEnhancer"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import type { ChapterInfo } from "./chapters"
import type { ResourcesLocator } from "./ResourcesLocator"

/**
 * An edge of the visible range with what the enhancer adds to it, so the
 * enriched result keeps the same two-edge shape as the one it enriches.
 */
export type EnhancerPaginationEdge = PaginationEdge & {
  chapterInfo: ChapterInfo | undefined
  spineItemReadingDirection: `rtl` | `ltr` | undefined
  absolutePageIndex: number | undefined
}

export type ExtraPaginationInfo = {
  percentageEstimateOfBook: number | undefined
  /**
   * @warning
   * This value is only correct for pre-paginated books and or
   * if you preload the entire book in case of reflow. This is because
   * items get loaded unloaded when navigating through the book, meaning
   * we cannot measure the number of pages accurately.
   */
  numberOfTotalPages: number | undefined
  isUsingSpread: boolean
  // numberOfSpineItems: number | undefined
}

/**
 * The enriched result discriminates on settlement exactly as the core one
 * does, over its own edge type — settlement is a property of the two edges'
 * positions, so it is expressed once and reused rather than restated here.
 */
export type EnhancerPaginationInto = ExtraPaginationInfo &
  VisibleRange<EnhancerPaginationEdge>

export type PaginationEnhancerAPI<
  InheritOutput extends EnhancerOutput<RootEnhancer> & LayoutEnhancerOutput,
> = Omit<InheritOutput, "pagination"> & {
  pagination: Omit<InheritOutput["pagination"], "state$" | "state"> & {
    state$: Observable<EnhancerPaginationInto>
    state: EnhancerPaginationInto
  }
  locateResource: ResourcesLocator["locateResource"]
}
