import type { Viewport } from "../../viewport/Viewport"
import type { ZoomPosition } from "./types"

/**
 * Make sure to constraint position within viewport boundaries when zoomed.
 * This only works when zoomed in.
 */
export const constrainPositionWithinViewport = (
  position: ZoomPosition,
  scale: number,
  viewport: Viewport,
) => {
  const { clientWidth, clientHeight } = viewport.value.element

  // Calculate the maximum allowed translation (always 0, top-left)
  // and minimum allowed translation (negative value representing the overflow)
  const bounds = {
    maxX: 0,
    minX: clientWidth * (1 - scale),
    maxY: 0,
    minY: clientHeight * (1 - scale),
  }

  return {
    x: Math.min(Math.max(position.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(position.y, bounds.minY), bounds.maxY),
  }
}
