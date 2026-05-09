import { SpinePosition, UnboundSpinePosition } from "../../spine/types"

type Args<P extends SpinePosition | UnboundSpinePosition> = {
  position: P
  pageSizeWidth: number
  visibleAreaRectWidth: number
}

/**
 * Snap `position.x` backward to the previous spread edge (a multiple of
 * `visibleAreaRectWidth`). Pure visual alignment — does not clamp to spine
 * bounds. The bound/unbound class of the input is preserved.
 */
export const getAdjustedPositionForSpread = <
  P extends SpinePosition | UnboundSpinePosition,
>({
  position,
  pageSizeWidth,
  visibleAreaRectWidth,
}: Args<P>): P => {
  const { x, y } = position
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  const next =
    position instanceof UnboundSpinePosition
      ? new UnboundSpinePosition({ x: correctedX, y })
      : new SpinePosition({ x: correctedX, y })

  // `instanceof` narrows `position`, but TS can't propagate that narrowing
  // to the picked constructor's return type, so we re-assert `P`. Sound:
  // each branch instantiates the same concrete class as `position`.
  return next as P
}
