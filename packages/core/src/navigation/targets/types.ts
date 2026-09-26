import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import type {
  InternalNavigationEntry,
  NavigationAnchor,
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
  /**
   * The place the target names. It is final only once the page holding it is
   * laid out, which `withAnchor` finds.
   */
  anchor?: Extract<NavigationAnchor, { isFinal: false }>
  directionFromLastNavigation: "forward" | "backward"
  snapToPage: boolean
  /**
   * Whether the target names a place in a spine item that is not loaded yet.
   * The navigation has no anchor until it is, and restorations resolve the
   * target again.
   */
  awaitsDocument: boolean
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
