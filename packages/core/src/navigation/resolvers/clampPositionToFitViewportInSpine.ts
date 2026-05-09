import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { clampRectInSpine } from "./clampRectInSpine"

export const NAMESPACE = `spineNavigator`

/**
 * Clamp `position` so the viewport rectangle (`visibleAreaRectWidth` ×
 * `pageSizeHeight`) sits flush with the book edge — never beyond it.
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
}) =>
  clampRectInSpine({
    position,
    size: { width: visibleAreaRectWidth, height: pageSizeHeight },
    isRTL,
    spineItemsManager,
    spine,
    viewportWidth: visibleAreaRectWidth,
  })
