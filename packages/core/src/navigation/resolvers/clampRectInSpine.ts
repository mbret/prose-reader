import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"

export type ClampRectInSpineParams = {
  position: SpinePosition | UnboundSpinePosition
  size: { width: number; height: number }
  isRTL: boolean
  spineItemsManager: SpineItemsManager
  spine: Spine
  viewportWidth: number
}

/**
 * Clamp a rectangle of the given `size`, positioned at `position` (top-left),
 * so that the rectangle fits inside the spine's bounding box.
 *
 * Special cases:
 * - With `size = { width: 1, height: 1 }` this is a "point clamp": the
 *   coordinate itself is forced inside the spine.
 * - With `size` set to the visible viewport dimensions this ensures the
 *   entire viewport rectangle lies inside the spine — see
 *   `clampPositionToFitViewportInSpine`.
 *
 * Coordinate convention:
 * - LTR: spine spreads positively from `x = 0` to `lastItem.right`.
 * - RTL: spine spreads negatively from `x = lastItem.left` (≤ 0) up to the
 *   right edge at `viewportWidth`, so positions are typically ≤ 0.
 */
export const clampRectInSpine = ({
  position,
  size,
  isRTL,
  spineItemsManager,
  spine,
  viewportWidth,
}: ClampRectInSpineParams): SpinePosition => {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )

  if (!lastSpineItem) {
    return new SpinePosition({ x: 0, y: 0 })
  }

  const last = spine.getSpineItemSpineLayoutInfo(lastSpineItem)

  const yMax = last.bottom - size.height
  const y = Math.min(Math.max(0, position.y), yMax)

  if (isRTL) {
    const xMax = viewportWidth - size.width
    const x = Math.max(last.left, Math.min(xMax, position.x))

    return new SpinePosition({ x, y })
  }

  const xMax = last.right - size.width
  const x = Math.min(Math.max(0, position.x), xMax)

  return new SpinePosition({ x, y })
}
