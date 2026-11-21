import type { Spine } from "../../spine/Spine.ts"
import type { SpinePosition } from "../../spine/types.ts"
import { UnboundSpinePosition } from "../../spine/types.ts"
import type { NavigationVisibleArea, SpineBoundary } from "../types.ts"

export type ClampRectInSpineParams = {
  position: SpinePosition | UnboundSpinePosition
  size: NavigationVisibleArea
  spine: Spine
}

type RectBoundsInSpineParams = Pick<ClampRectInSpineParams, "size" | "spine">

type RectBoundsInSpine = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

const getRectBoundsInSpine = ({
  size,
  spine,
}: RectBoundsInSpineParams): RectBoundsInSpine | undefined => {
  const { boundingBox } = spine

  if (!boundingBox) return undefined

  return {
    xMin: boundingBox.left,
    xMax: Math.max(0, boundingBox.right - size.width),
    yMin: boundingBox.top,
    yMax: Math.max(0, boundingBox.bottom - size.height),
  }
}

/**
 * Clamp a rectangle (`size` at `position` top-left) so it fits inside the
 * spine's bounding box.
 */
export const clampRectInSpine = ({
  position,
  size,
  spine,
}: ClampRectInSpineParams): UnboundSpinePosition => {
  const bounds = getRectBoundsInSpine({ size, spine })

  if (!bounds) return new UnboundSpinePosition({ x: 0, y: 0 })

  return new UnboundSpinePosition({
    x: Math.min(Math.max(bounds.xMin, position.x), bounds.xMax),
    y: Math.min(Math.max(bounds.yMin, position.y), bounds.yMax),
  })
}

/**
 * The edge of the spine a rectangle (`size` at `position` top-left) is past,
 * in reading order, or `undefined` when it fits.
 */
export const getBoundaryForRectInSpine = ({
  position,
  size,
  isRTL,
  spine,
}: ClampRectInSpineParams & { isRTL: boolean }): SpineBoundary | undefined => {
  const bounds = getRectBoundsInSpine({ size, spine })

  if (!bounds) return undefined

  if (position.y < bounds.yMin) return "start"
  if (position.y > bounds.yMax) return "end"

  if (isRTL) {
    if (position.x > bounds.xMax) return "start"
    if (position.x < bounds.xMin) return "end"
  } else {
    if (position.x < bounds.xMin) return "start"
    if (position.x > bounds.xMax) return "end"
  }

  return undefined
}
