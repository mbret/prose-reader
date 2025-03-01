import type { SpinePosition } from "../../spine/types"
import type { ViewportPosition } from "../viewport/ViewportNavigator"

export const getAdjustedPositionForSpread = ({
  position: { x, y },
  pageSizeWidth,
  visibleAreaRectWidth,
}: {
  position: ViewportPosition | SpinePosition
  pageSizeWidth: number
  visibleAreaRectWidth: number
}): ViewportPosition => {
  const isOffsetNotAtEdge = x % visibleAreaRectWidth !== 0
  const correctedX = isOffsetNotAtEdge ? x - pageSizeWidth : x

  return { x: correctedX, y }
}
