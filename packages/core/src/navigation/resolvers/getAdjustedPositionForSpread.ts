import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"

export const getAdjustedPositionForSpread = ({
  position: { x, y },
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  position: SpinePosition | UnboundSpinePosition
  pageSizeWidth: number
  visibleAreaRectWidth: number
}): SpinePosition => {
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  return new SpinePosition({ x: correctedX, y })
}
