import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpinePosition } from "../../spine/types"
import { UnboundSpinePosition } from "../../spine/types"

export type ClampRectInSpineParams = {
  position: SpinePosition | UnboundSpinePosition
  size: { width: number; height: number }
  isRTL: boolean
  spineItemsManager: SpineItemsManager
  spine: Spine
}

/**
 * Clamp a rectangle (`size` at `position` top-left) so it fits inside the
 * spine's bounding box.
 */
export const clampRectInSpine = ({
  position,
  size,
  isRTL,
  spineItemsManager,
  spine,
}: ClampRectInSpineParams): UnboundSpinePosition => {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )

  if (!lastSpineItem) {
    return new UnboundSpinePosition({ x: 0, y: 0 })
  }

  const last = spine.getSpineItemSpineLayoutInfo(lastSpineItem)

  const yMax = Math.max(0, last.bottom - size.height)
  const y = Math.min(Math.max(0, position.y), yMax)

  if (isRTL) {
    const firstSpineItem = spineItemsManager.get(0)
    const right = firstSpineItem
      ? spine.getSpineItemSpineLayoutInfo(firstSpineItem).right
      : 0
    const xMax = Math.max(0, right - size.width)
    const x = Math.max(last.left, Math.min(xMax, position.x))

    return new UnboundSpinePosition({ x, y })
  }

  const xMax = Math.max(0, last.right - size.width)
  const x = Math.min(Math.max(0, position.x), xMax)

  return new UnboundSpinePosition({ x, y })
}
