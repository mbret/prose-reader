import { SpinePosition } from "../../spine/types"
import type { DeprecatedViewportPosition } from "../viewport/ViewportNavigator"

export const getAdjustedPositionForSpread = ({
  position: { x, y },
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  pageSizeWidth: number
  visibleAreaRectWidth: number
}): DeprecatedViewportPosition => {
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  return new SpinePosition({ x: correctedX, y })
}
