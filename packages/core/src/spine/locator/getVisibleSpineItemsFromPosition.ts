import type { SpineItem } from "../../spineItem/SpineItem"
import { ViewportSlicePosition } from "../../viewport/types"
import type { Viewport } from "../../viewport/Viewport"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import { type SpinePosition, UnboundSpinePosition } from "../types"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"

/**
 * The first and last spine items a slice of the spine shows, each enough to
 * reach the threshold. When none does, the spine item the slice starts in, or
 * else the first one.
 */
export const getVisibleSpineItemsFromSlice = ({
  slice,
  threshold,
  restrictToScreen,
  spineItemsManager,
  spineLayout,
}: {
  slice: ViewportSlicePosition
  threshold:
    | { type: "percentage"; value: number }
    | { type: "pixels"; value: number }
  restrictToScreen?: boolean
  spineItemsManager: SpineItemsManager
  spineLayout: SpineLayout
}):
  | {
      beginIndex: number
      endIndex: number
    }
  | undefined => {
  const fallbackSpineItem =
    getSpineItemFromPosition({
      position: new UnboundSpinePosition({ x: slice.x, y: slice.y }),
      spineItemsManager,
      spineLayout,
    }) || spineItemsManager.get(0)

  const spineItemsVisible: SpineItem[] = []

  for (const spineItem of spineItemsManager.items) {
    const itemPosition = spineLayout.getSpineItemSpineLayoutInfo(spineItem)
    const { visible } = getItemVisibilityForPosition({
      itemPosition,
      threshold,
      viewportPosition: slice,
      restrictToScreen,
    })

    if (visible) {
      spineItemsVisible.push(spineItem)
    }
  }

  const beginItem = spineItemsVisible[0] ?? fallbackSpineItem
  const endItem = spineItemsVisible[spineItemsVisible.length - 1] ?? beginItem

  if (!beginItem || !endItem) return undefined

  const beginItemIndex = spineItemsManager.getSpineItemIndex(beginItem)
  const endItemIndex = spineItemsManager.getSpineItemIndex(endItem)

  return {
    beginIndex: beginItemIndex ?? 0,
    endIndex: endItemIndex ?? 0,
  }
}

/**
 * The first and last spine items the absolute viewport shows at a position:
 * what a navigation there shows, whatever a zoom shows around it.
 */
export const getVisibleSpineItemsFromPosition = ({
  position,
  viewport,
  ...options
}: Omit<Parameters<typeof getVisibleSpineItemsFromSlice>[0], "slice"> & {
  position: SpinePosition | UnboundSpinePosition
  viewport: Viewport
}) =>
  getVisibleSpineItemsFromSlice({
    ...options,
    slice: ViewportSlicePosition.from(position, viewport.absoluteViewport),
  })
