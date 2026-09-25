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
  snapToPage: boolean
  awaitsDocument?: boolean
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
