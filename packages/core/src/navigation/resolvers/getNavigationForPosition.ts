import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition, type UnboundSpinePosition } from "../../spine/types"
import type { Viewport } from "../../viewport/Viewport"
import { getNavigationFromSpineItemPosition } from "./getNavigationFromSpineItemPosition"

export const getNavigationForPosition = ({
  viewportPosition,
  spineLocator,
  viewport,
}: {
  viewportPosition: SpinePosition | UnboundSpinePosition
  spineLocator: SpineLocator
  viewport: Viewport
}) => {
  const spineItem = spineLocator.getSpineItemFromPosition(viewportPosition)

  if (!spineItem) return new SpinePosition({ x: 0, y: 0 })

  return getNavigationFromSpineItemPosition({
    spineItem,
    spineItemPosition: spineLocator.getSpineItemPositionFromSpinePosition(
      viewportPosition,
      spineItem,
    ),
    spineLocator,
    viewport,
  })
}
