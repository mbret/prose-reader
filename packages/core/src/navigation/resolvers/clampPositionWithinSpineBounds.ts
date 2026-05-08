import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"

export const NAMESPACE = `spineNavigator`

type SharedParams = {
  isRTL: boolean
  spineItemsManager: SpineItemsManager
  spine: Spine
  viewportWidth: number
}

export function clampPositionWithinSpineBounds(
  params: SharedParams & {
    position: SpinePosition
  },
): SpinePosition

export function clampPositionWithinSpineBounds(
  params: SharedParams & {
    position: UnboundSpinePosition
  },
): UnboundSpinePosition

export function clampPositionWithinSpineBounds(
  params: SharedParams & {
    position: UnboundSpinePosition | SpinePosition
  },
): UnboundSpinePosition | SpinePosition

/**
 * Treat `position` as a single point and clamp it to the spine rectangle.
 *
 * The result is guaranteed to lie inside `[0, lastSpineRight - 1]` × `[0, lastSpineBottom - 1]`
 * (RTL clamps x to `[lastSpineLeft, viewportWidth]` instead). Use this when you
 * need a valid coordinate inside the spine — e.g. resolving a CFI, identifying
 * which spine item contains the position. Does *not* guarantee that a viewport
 * rendered at this position fits inside the spine; for that, use
 * `clampPositionToFitViewportInSpine` instead.
 */
export function clampPositionWithinSpineBounds({
  position,
  isRTL,
  spineItemsManager,
  spine,
  viewportWidth,
}: SharedParams & {
  position: SpinePosition | UnboundSpinePosition
}): SpinePosition | UnboundSpinePosition {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )
  const distanceOfLastSpineItem = spine.getSpineItemSpineLayoutInfo(
    lastSpineItem || 0,
  )

  // fallback on last element (before last pixel)
  const maximumYOffset = distanceOfLastSpineItem.bottom - 1
  const positiveY = Math.max(0, position.y)
  const y = Math.min(positiveY, maximumYOffset)

  /**
   * For RTL books we move from right to left so negative x.
   * [-x, 0]
   */
  if (isRTL) {
    const maximumX = Math.min(viewportWidth, position.x)
    const minimumX = Math.max(maximumX, distanceOfLastSpineItem.left)

    return new SpinePosition({
      x: minimumX,
      y,
    })
  }

  // fallback on last element (before last pixel)
  const maximumXOffset = distanceOfLastSpineItem.right - 1
  const positiveX = Math.max(0, position.x)
  const boundedX = Math.min(positiveX, maximumXOffset)

  return new SpinePosition({
    x: boundedX,
    y,
  })
}
