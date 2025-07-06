import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"

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
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )
  const distanceOfLastSpineItem = spine.getSpineItemSpineLayoutInfo(
    lastSpineItem || 0,
  )

  const maximumYOffset = distanceOfLastSpineItem.bottom - pageSizeHeight
  const y = Math.min(Math.max(0, position.y), maximumYOffset)

  /**
   * For RTL books we move from right to left so negative x.
   * [-x, 0]
   */
  if (isRTL) {
    return new SpinePosition({
      x: Math.max(Math.min(0, position.x), distanceOfLastSpineItem.left),
      y,
    })
  }

  const maximumXOffset = distanceOfLastSpineItem.right - visibleAreaRectWidth

  return new SpinePosition({
    x: Math.min(Math.max(0, position.x), maximumXOffset),
    y,
  })
}
