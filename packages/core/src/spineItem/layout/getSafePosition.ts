import { SpineItemPosition } from "../types"

export const getSafePosition = ({
  itemWidth,
  itemHeight,
  spineItemPosition,
}: {
  spineItemPosition: SpineItemPosition
  itemWidth: number
  itemHeight: number
}): SpineItemPosition =>
  new SpineItemPosition({
    x: Math.min(itemWidth, Math.max(0, spineItemPosition.x)),
    y: Math.min(itemHeight, Math.max(0, spineItemPosition.y)),
  })
