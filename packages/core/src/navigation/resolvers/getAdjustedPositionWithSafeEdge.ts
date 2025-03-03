import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineLayout } from "../../spine/SpineLayout"
import { SpinePosition } from "../../spine/types"
import type { DeprecatedViewportPosition } from "../controllers/ControlledNavigationController"

export const NAMESPACE = `spineNavigator`

export const getAdjustedPositionWithSafeEdge = ({
  position,
  isRTL,
  pageSizeHeight,
  spineItemsManager,
  visibleAreaRectWidth,
  spineLayout,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  isRTL: boolean
  pageSizeHeight: number
  spineItemsManager: SpineItemsManager
  visibleAreaRectWidth: number
  spineLayout: SpineLayout
}) => {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )
  const distanceOfLastSpineItem = spineLayout.getSpineItemSpineLayoutInfo(
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
