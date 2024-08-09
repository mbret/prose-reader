import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { ViewportPosition } from "../viewport/ViewportNavigator"

export const NAMESPACE = `spineNavigator`

export const wrapPositionWithSafeEdge = ({
  position,
  isRTL,
  pageSizeWidth,
  pageSizeHeight,
  spineItemsManager,
}: {
  position: ViewportPosition
  isRTL: boolean
  pageSizeWidth: number
  pageSizeHeight: number
  spineItemsManager: SpineItemsManager
}) => {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(spineItemsManager.getLength() - 1)
  const distanceOfLastSpineItem = spineItemsManager.getAbsolutePositionOf(
    lastSpineItem || 0,
  )

  const maximumYOffset = distanceOfLastSpineItem.bottom - pageSizeHeight
  const y = Math.min(Math.max(0, position.y), maximumYOffset)

  /**
   * For RTL books we move from right to left so negative x.
   * [-x, 0]
   */
  if (isRTL) {
    return {
      x: Math.max(Math.min(0, position.x), distanceOfLastSpineItem.left),
      y,
    }
  }

  const maximumXOffset = distanceOfLastSpineItem.right - pageSizeWidth

  return {
    x: Math.min(Math.max(0, position.x), maximumXOffset),
    y,
  }
}
