import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import { clampPositionWithinSpineBounds } from "./clampPositionWithinSpineBounds"

export const NAMESPACE = `spineNavigator`

/**
 * Treat `position` as the top-left of a viewport (size
 * `visibleAreaRectWidth` × `pageSizeHeight`) and clamp it so the entire
 * viewport rectangle fits inside the spine.
 *
 * Composed on top of `clampPositionWithinSpineBounds`: it first ensures the
 * point is inside the spine, then tightens the upper bound by the viewport
 * size on each axis. Use this when you're about to render and need the
 * viewport flush with the book edge (e.g. paginated page-turn at end of book).
 */
export const clampPositionToFitViewportInSpine = ({
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
  const unboundPosition = clampPositionWithinSpineBounds({
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
  const y = Math.min(unboundPosition.y, maximumYOffset)

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
