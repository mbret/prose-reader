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
  position: SpinePosition | UnboundSpinePosition
  id: symbol
  meta: {
    triggeredBy: `user` | `restoration` | `pagination`
  }
  /**
   * The user-facing navigation that produced this entry, captured before the
   * navigator clamped, restored, or otherwise resolved it. For user-driven
   * entries this is the original `UserNavigationEntry` passed to
   * `reader.navigation.navigate(...)`; for restoration / pagination cycles
   * (which are self-driven) it mirrors the resolved `position` so the entry
   * is, by definition, in-bounds with respect to its own request.
   *
   * Comparing `requestedNavigation.position` to `position` is the canonical
   * way to detect that a request was clamped at a spine boundary
   * (see `observeBoundaryReached` in `enhancers/navigation/boundary.ts`).
   *
   * Writers — keep these aligned, boundary detection depends on it:
   * - `mapUserNavigationToInternal` — copies the original `UserNavigationEntry`
   *   verbatim so out-of-bounds intent survives clamping.
   * - `InternalNavigator` restoration branch — synthesizes
   *   `{ position: navigation.position }` so self-driven corrections never
   *   look like overshoots.
   * - `consolidateWithPagination` — same synthesis as restoration, for the
   *   pagination-driven refresh cycle.
   *
   * If a new writer is added, it must follow one of these two contracts
   * (preserve user intent, or mirror the resolved position) — anything in
   * between will silently break boundary detection.
   */
  requestedNavigation: UserNavigationEntry
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

export type Navigation = Pick<
  InternalNavigationEntry,
  "position" | "id" | "requestedNavigation"
>
