import type { SpinePosition } from "../spine/types"
import type { DeprecatedViewportPosition } from "./controllers/ControlledNavigationController"

export type UserNavigationEntry = {
  position?: DeprecatedViewportPosition | SpinePosition
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
