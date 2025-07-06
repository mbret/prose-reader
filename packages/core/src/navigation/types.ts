import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import type {
  SpineItemPosition,
  UnboundSpineItemPagePosition,
} from "../spineItem/types"

export type UserNavigationEntry = {
  position?: SpinePosition | UnboundSpinePosition
  spineItem?: number | string
  url?: string | URL
  cfi?: string
  animation?: boolean | "turn" | "snap"
  type?: "api" | "scroll"
  /**
   * Useful to be specified when navigating with pan
   * and where a couple of px can go backward for the
   * last navigation (finger release)
   */
  direction?: "left" | "right" | "top" | "bottom"
}

export type NavigationConsolidation = {
  spineItemHeight?: number
  spineItemWidth?: number
  spineItemTop?: number
  spineItemLeft?: number
  spineItemIsReady?: boolean
  spineItemIsUsingVerticalWriting?: boolean
  paginationBeginCfi?: string
  /**
   * Useful for restoration to anchor back at an accurate
   * position in the item. If the item changed its content
   * we cannot assume it's accurate and will need more info.
   */
  positionInSpineItem?: SpineItemPosition | UnboundSpineItemPagePosition
  /**
   * Useful in restoration to anchor back to spine item position.
   * Whether we should anchor from bottom or top of the item.
   * Works with `positionInSpineItem`
   *
   * @forward : Used when the user navigate to position only. We will
   * try to restore position starting from beginning of item.
   *
   * @backward : Used when the user navigate to position only. We will
   * try to restore position starting from end of item.
   *
   * @anchor : similar to forward but more specific on the intent
   */
  directionFromLastNavigation?: "forward" | "backward" | "anchor"
}

/**
 * Priority of info taken for restoration:
 * - URL
 * - complete cfi
 * - incomplete cfi
 * - spine item position
 * - spine item (fallback)
 */
export type InternalNavigationEntry = {
  position: SpinePosition | SpinePosition | UnboundSpinePosition
  id: symbol
  meta: {
    triggeredBy: `user` | `restoration` | `pagination`
  }
  type: `api` | `scroll`
  animation?: boolean | `turn` | `snap`
  // direction?: "left" | "right" | "top" | "bottom"
  url?: string | URL
  spineItem?: string | number
  cfi?: string
} & NavigationConsolidation

export type InternalNavigationInput = Omit<
  InternalNavigationEntry,
  "position"
> & {
  position?: SpinePosition | UnboundSpinePosition
}

export type Navigation = Pick<InternalNavigationEntry, "position" | "id">
