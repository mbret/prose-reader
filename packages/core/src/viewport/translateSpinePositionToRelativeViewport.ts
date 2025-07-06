import { type SpinePosition, UnboundSpinePosition } from "../spine/types"
import type { AbsoluteViewport, RelativeViewport } from "./types"

export const translateSpinePositionToRelativeViewport = (
  absolutePosition: SpinePosition | UnboundSpinePosition,
  absoluteViewport: AbsoluteViewport,
  relativeViewport: RelativeViewport | AbsoluteViewport,
): UnboundSpinePosition => {
  // Calculate the offset needed to center the relative viewport within the absolute viewport
  const offsetX = (relativeViewport.width - absoluteViewport.width) / 2
  const offsetY = (relativeViewport.height - absoluteViewport.height) / 2

  return new UnboundSpinePosition({
    x: absolutePosition.x - offsetX,
    y: absolutePosition.y - offsetY,
  })
}
