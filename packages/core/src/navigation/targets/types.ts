import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import type {
  InternalNavigationEntry,
  NavigationTargetType,
  NavigationTargetValues,
  NavigationVisibleArea,
} from "../types"

/**
 * What a target tells of where its navigation goes. The consolidation steps
 * after it fill in the rest the same way whatever the target was: the item is
 * found from the position when the target names none, the position is the
 * item start when the target gives none, and the anchor is the page landed on
 * when the target names none.
 */
export type TargetResolution = {
  /** The spine item the target goes to, by index or id. */
  spineItem?: number | string
  /** Where the target goes in the spine. */
  position?: SpinePosition | UnboundSpinePosition
  /** The raw position the target asked for, when it asked for one. */
  requestedPosition?: SpinePosition | UnboundSpinePosition
  /** The visible area that gives meaning to `requestedPosition`. */
  requestedVisibleArea?: NavigationVisibleArea
  /** Where the target goes in the text, when it names a place in it. */
  anchor?: string
  directionFromLastNavigation: "forward" | "backward"
  /**
   * Whether `position` is exactly where the target goes. A position that is
   * not is snapped to the page it falls on, in controlled mode.
   */
  isExact: boolean
}

export type TargetResolverContext = {
  previousNavigation: InternalNavigationEntry
}

/**
 * One resolver per target type, each given the value of its own type.
 */
export type NavigationTargetResolvers = {
  [Type in NavigationTargetType]: (
    value: NavigationTargetValues[Type],
    context: TargetResolverContext,
  ) => TargetResolution
}
