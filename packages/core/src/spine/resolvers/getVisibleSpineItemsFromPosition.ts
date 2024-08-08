import { Context } from "../../context/Context"
import { ViewportPosition } from "../../navigation/ViewportNavigator"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItem } from "../../spineItem/createSpineItem"
import { SpineItemsManager } from "../SpineItemsManager"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"

export const getVisibleSpineItemsFromPosition = ({
  position,
  threshold,
  restrictToScreen,
  spineItemsManager,
  context,
  settings,
}: {
  position: ViewportPosition
  threshold: number
  restrictToScreen?: boolean
  spineItemsManager: SpineItemsManager
  context: Context
  settings: ReaderSettingsManager
}):
  | {
      beginIndex: number
      // beginPosition: ViewportPosition
      endIndex: number
      // endPosition: ViewportPosition
    }
  | undefined => {
  const fallbackSpineItem =
    getSpineItemFromPosition({ position, settings, spineItemsManager }) ||
    spineItemsManager.get(0)

  const spineItemsVisible = spineItemsManager
    .getAll()
    .reduce<SpineItem[]>((acc, spineItem) => {
      const itemPosition = spineItemsManager.getAbsolutePositionOf(spineItem)

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
    }, [])

  const beginItem = spineItemsVisible[0] ?? fallbackSpineItem
  const endItem = spineItemsVisible[spineItemsVisible.length - 1] ?? beginItem

  if (!beginItem || !endItem) return undefined

  const beginItemIndex = spineItemsManager.getSpineItemIndex(beginItem)
  const endItemIndex = spineItemsManager.getSpineItemIndex(endItem)

  return {
    beginIndex: beginItemIndex ?? 0,
    // beginPosition: position,
    endIndex: endItemIndex ?? 0,
    // endPosition: position,
  }
}
