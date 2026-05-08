import type { Spine } from "../../spine/Spine"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { clampRectInSpine } from "./clampRectInSpine"

export const NAMESPACE = `spineNavigator`

/**
 * Treat `position` as the top-left of a viewport (size
 * `visibleAreaRectWidth` × `pageSizeHeight`) and clamp it so the entire
 * viewport rectangle fits inside the spine.
 *
 * Use this when you're about to render and need the viewport flush with the
 * book edge (e.g. paginated page-turn at end of book).
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
