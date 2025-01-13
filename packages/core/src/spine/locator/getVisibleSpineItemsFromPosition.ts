import type { Context } from "../../context/Context"
import type { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"

export const getVisibleSpineItemsFromPosition = ({
  position,
  threshold,
  restrictToScreen,
  spineItemsManager,
  context,
  settings,
  spineLayout,
}: {
  position: ViewportPosition
  threshold: number
  restrictToScreen?: boolean
  spineItemsManager: SpineItemsManager
  context: Context
  settings: ReaderSettingsManager
  spineLayout: SpineLayout
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
      const itemPosition = spineLayout.getAbsolutePositionOf(spineItem)

      const { visible } = getItemVisibilityForPosition({
        itemPosition,
        threshold,
        viewportPosition: position,
        restrictToScreen,
        context,
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
