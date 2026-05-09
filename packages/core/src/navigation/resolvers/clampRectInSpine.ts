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
 * Clamp a rectangle (`size` at `position` top-left) so it fits inside the
 * spine's bounding box. RTL spines extend negatively from `lastItem.left`
 * (≤ 0) up to `viewportWidth`, so RTL positions are typically ≤ 0.
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
