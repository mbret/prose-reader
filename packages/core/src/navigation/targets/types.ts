import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import type {
  InternalNavigationEntry,
  NavigationTargetType,
  NavigationTargetValues,
  NavigationVisibleArea,
} from "../types"

/**
 * What a target tells of where its navigation goes. The steps after it fill
 * in what it leaves out.
 */
export type TargetResolution = {
  spineItem?: number | string
  position?: SpinePosition | UnboundSpinePosition
  requestedPosition?: SpinePosition | UnboundSpinePosition
  requestedVisibleArea?: NavigationVisibleArea
  anchor?: string
  directionFromLastNavigation: "forward" | "backward"
  /** Otherwise `position` is snapped to the page it falls on. */
  isExact: boolean
  /**
   * The target names a place in a document that is not loaded yet. Until it
   * is, the navigation takes no anchor from the page it lands on, which can
   * be another item's, so restorations keep resolving the target.
   */
  isPending?: boolean
}

export type TargetResolverContext = {
  previousNavigation: InternalNavigationEntry
}

export type NavigationTargetResolvers = {
  [Type in NavigationTargetType]: (
    value: NavigationTargetValues[Type],
    context: TargetResolverContext,
  ) => TargetResolution
}
