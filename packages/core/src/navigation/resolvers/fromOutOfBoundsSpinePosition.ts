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

export function fromOutOfBoundsSpinePosition(
  params: SharedParams & {
    position: SpinePosition
  },
): SpinePosition

export function fromOutOfBoundsSpinePosition(
  params: SharedParams & {
    position: UnboundSpinePosition
  },
): UnboundSpinePosition

export function fromOutOfBoundsSpinePosition(
  params: SharedParams & {
    position: UnboundSpinePosition | SpinePosition
  },
): UnboundSpinePosition | SpinePosition

/**
 * Only make sure x/y are not out of the bounds of the spine.
 */
export function fromOutOfBoundsSpinePosition({
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

  const maximumYOffset = distanceOfLastSpineItem.bottom
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

  const maximumXOffset = distanceOfLastSpineItem.right
  const positiveX = Math.max(0, position.x)
  const boundedX = Math.min(positiveX, maximumXOffset)

  return new SpinePosition({
    x: boundedX,
    y,
  })
}
