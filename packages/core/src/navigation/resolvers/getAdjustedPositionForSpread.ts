import { SpinePosition, UnboundSpinePosition } from "../../spine/types"

type Args<P extends SpinePosition | UnboundSpinePosition> = {
  position: P
  pageSizeWidth: number
  visibleAreaRectWidth: number
}

/**
 * Snap `position.x` backward to the previous spread edge (a multiple of
 * `visibleAreaRectWidth`). Pure visual alignment — does not clamp to spine
 * bounds.
 */
export function getAdjustedPositionForSpread(
  args: Args<SpinePosition>,
): SpinePosition
export function getAdjustedPositionForSpread(
  args: Args<UnboundSpinePosition>,
): UnboundSpinePosition
export function getAdjustedPositionForSpread(
  args: Args<SpinePosition | UnboundSpinePosition>,
): SpinePosition | UnboundSpinePosition
export function getAdjustedPositionForSpread({
  position,
  pageSizeWidth,
  visibleAreaRectWidth,
}: Args<SpinePosition | UnboundSpinePosition>):
  | SpinePosition
  | UnboundSpinePosition {
  const { x, y } = position
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  if (position instanceof UnboundSpinePosition) {
    return new UnboundSpinePosition({ x: correctedX, y })
  }

  return new SpinePosition({ x: correctedX, y })
}
