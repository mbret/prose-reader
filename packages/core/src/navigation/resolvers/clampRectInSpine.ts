import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpinePosition } from "../../spine/types"
import { UnboundSpinePosition } from "../../spine/types"
import type { SpineBoundary } from "../types"

export type ClampRectInSpineParams = {
  position: SpinePosition | UnboundSpinePosition
  size: { width: number; height: number }
  isRTL: boolean
  spineItemsManager: SpineItemsManager
  spine: Spine
}

type RectBoundsInSpineParams = Omit<ClampRectInSpineParams, "position">

type RectBoundsInSpine = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

const getRectBoundsInSpine = ({
  size,
  isRTL,
  spineItemsManager,
  spine,
}: RectBoundsInSpineParams): RectBoundsInSpine | undefined => {
  // @todo use container width instead to increase performances
  const lastSpineItem = spineItemsManager.get(
    spineItemsManager.items.length - 1,
  )

  if (!lastSpineItem) return undefined

  const last = spine.getSpineItemSpineLayoutInfo(lastSpineItem)
  const yMax = Math.max(0, last.bottom - size.height)

  if (isRTL) {
    const firstSpineItem = spineItemsManager.get(0)
    const right = firstSpineItem
      ? spine.getSpineItemSpineLayoutInfo(firstSpineItem).right
      : 0

    return {
      xMin: last.left,
      xMax: Math.max(0, right - size.width),
      yMin: 0,
      yMax,
    }
  }

  return {
    xMin: 0,
    xMax: Math.max(0, last.right - size.width),
    yMin: 0,
    yMax,
  }
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
  const bounds = getRectBoundsInSpine({
    size,
    isRTL,
    spineItemsManager,
    spine,
  })

  if (!bounds) return new UnboundSpinePosition({ x: 0, y: 0 })

  const y = Math.min(Math.max(bounds.yMin, position.y), bounds.yMax)
  const x = isRTL
    ? Math.max(bounds.xMin, Math.min(bounds.xMax, position.x))
    : Math.min(Math.max(bounds.xMin, position.x), bounds.xMax)

  return new UnboundSpinePosition({ x, y })
}

export const getBoundaryForRectInSpine = ({
  position,
  size,
  isRTL,
  spineItemsManager,
  spine,
}: ClampRectInSpineParams): SpineBoundary | undefined => {
  const bounds = getRectBoundsInSpine({
    size,
    isRTL,
    spineItemsManager,
    spine,
  })

  if (!bounds) return undefined

  if (position.y < bounds.yMin) return "start"
  if (position.y > bounds.yMax) return "end"

  if (isRTL) {
    if (position.x > bounds.xMax) return "start"
    if (position.x < bounds.xMin) return "end"
  } else {
    if (position.x < bounds.xMin) return "start"
    if (position.x > bounds.xMax) return "end"
  }

  return undefined
}
