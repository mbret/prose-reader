import type { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import type { LayoutPosition } from "../SpineLayout"

export const convertSpinePositionToLayoutPosition = ({
  position,
  pageSize,
}: {
  position: ViewportPosition
  pageSize: { height: number; width: number }
}): LayoutPosition => {
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
