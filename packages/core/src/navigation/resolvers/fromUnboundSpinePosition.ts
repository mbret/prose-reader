import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import { fromOutOfBoundsSpinePosition } from "./fromOutOfBoundsSpinePosition"

export const NAMESPACE = `spineNavigator`

export const fromUnboundSpinePosition = ({
  position,
  isRTL,
  pageSizeHeight,
  spineItemsManager,
  visibleAreaRectWidth,
  spine,
}: {
  position: SpinePosition | UnboundSpinePosition
  isRTL: boolean
  pageSizeHeight: number
  spineItemsManager: SpineItemsManager
  visibleAreaRectWidth: number
  spine: Spine
}) => {
  const unboundPosition = fromOutOfBoundsSpinePosition({
    position,
    isRTL,
    spineItemsManager,
    spine,
    viewportWidth: visibleAreaRectWidth,
  })

  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )
  const distanceOfLastSpineItem =
    spine.getSpineItemSpineLayoutInfo(lastSpineItem)

  const maximumYOffset = distanceOfLastSpineItem.bottom - pageSizeHeight
  const y = Math.min(unboundPosition.x, maximumYOffset)

  /**
   * For RTL books we move from right to left so negative x.
   * [-x, 0]
   */
  if (isRTL) {
    const maximumX = Math.min(0, unboundPosition.x)

    return new SpinePosition({
      x: maximumX,
      y,
    })
  }

  const maximumXOffset = distanceOfLastSpineItem.right - visibleAreaRectWidth

  return new SpinePosition({
    x: Math.min(unboundPosition.x, maximumXOffset),
    y,
  })
}
