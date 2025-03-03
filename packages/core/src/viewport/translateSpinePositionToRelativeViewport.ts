import type { DeprecatedViewportPosition } from "../navigation/controllers/ControlledController"
import { type SpinePosition, UnsafeSpinePosition } from "../spine/types"
import type { AbsoluteViewport, RelativeViewport } from "./types"

export const translateSpinePositionToRelativeViewport = (
  absolutePosition: DeprecatedViewportPosition | SpinePosition,
  absoluteViewport: AbsoluteViewport,
  relativeViewport: RelativeViewport | AbsoluteViewport,
): UnsafeSpinePosition => {
  // Calculate the offset needed to center the relative viewport within the absolute viewport
  const offsetX = (relativeViewport.width - absoluteViewport.width) / 2
  const offsetY = (relativeViewport.height - absoluteViewport.height) / 2

  return new UnsafeSpinePosition({
    x: absolutePosition.x - offsetX,
    y: absolutePosition.y - offsetY,
  })
}
