import type { DeprecatedViewportPosition } from "../../navigation/types"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { Viewport } from "../../viewport/Viewport"
import { translateSpinePositionToRelativeViewport } from "../../viewport/translateSpinePositionToRelativeViewport"
import { ViewportSlicePosition } from "../../viewport/types"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpinePosition } from "../types"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"

export const getVisibleSpineItemsFromPosition = ({
  position,
  threshold,
  restrictToScreen,
  spineItemsManager,
  settings,
  spineLayout,
  useAbsoluteViewport = true,
  viewport,
}: {
  position: DeprecatedViewportPosition | SpinePosition
  threshold:
    | { type: "percentage"; value: number }
    | { type: "pixels"; value: number }
  restrictToScreen?: boolean
  spineItemsManager: SpineItemsManager
  settings: ReaderSettingsManager
  spineLayout: SpineLayout
  useAbsoluteViewport?: boolean
  viewport: Viewport
}):
  | {
      beginIndex: number
      endIndex: number
    }
  | undefined => {
  const fallbackSpineItem =
    getSpineItemFromPosition({
      position,
      settings,
      spineItemsManager,
      spineLayout,
    }) || spineItemsManager.get(0)

  const spineItemsVisible = spineItemsManager.items.reduce<SpineItem[]>(
    (acc, spineItem) => {
      const itemPosition = spineLayout.getSpineItemSpineLayoutInfo(spineItem)
      const viewportInfo = useAbsoluteViewport
        ? viewport.absoluteViewport
        : viewport.relativeViewport
      const relativeSpinePosition = translateSpinePositionToRelativeViewport(
        position,
        viewport.absoluteViewport,
        viewportInfo,
      )

      const viewportPosition = ViewportSlicePosition.from(
        relativeSpinePosition,
        viewportInfo,
      )
      const { visible } = getItemVisibilityForPosition({
        itemPosition,
        threshold,
        viewportPosition,
        restrictToScreen,
      })

      if (visible) {
        return [...acc, spineItem]
      }

      return acc
    },
    [],
  )

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
