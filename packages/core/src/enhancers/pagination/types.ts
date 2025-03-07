import type { Observable } from "rxjs"
import type { PaginationInfo } from "../../pagination/Pagination"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import type { ResourcesLocator } from "./ResourcesLocator"
import type { ChapterInfo } from "./chapters"

export type ExtraPaginationInfo = {
  beginChapterInfo: ChapterInfo | undefined
  beginSpineItemReadingDirection: `rtl` | `ltr` | undefined
  beginAbsolutePageIndex: number | undefined
  endChapterInfo: ChapterInfo | undefined
  endSpineItemReadingDirection: `rtl` | `ltr` | undefined
  endAbsolutePageIndex: number | undefined
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

export type EnhancerPaginationInto = PaginationInfo & ExtraPaginationInfo

export type PaginationEnhancerAPI<
  InheritOutput extends EnhancerOutput<RootEnhancer>,
> = Omit<InheritOutput, "pagination"> & {
  pagination: Omit<InheritOutput["pagination"], "state$" | "state"> & {
    state$: Observable<PaginationInfo & ExtraPaginationInfo>
    state: PaginationInfo & ExtraPaginationInfo
  }
  locateResources: ResourcesLocator["locateMultiple"]
  locateResource: ResourcesLocator["locate"]
}
