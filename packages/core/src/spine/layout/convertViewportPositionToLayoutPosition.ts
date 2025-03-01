import type { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import type { SpineItemRelativeLayout } from "./types"

export const convertSpinePositionToLayoutPosition = ({
  position,
  pageSize,
}: {
  position: ViewportPosition
  pageSize: { height: number; width: number }
}): SpineItemRelativeLayout => {
  return {
    x: position.x,
    y: position.y,
    left: position.x,
    top: position.y,
    width: pageSize.width,
    height: pageSize.height,
    bottom: position.y + pageSize.height,
    right: position.x + pageSize.width,
  }
}
