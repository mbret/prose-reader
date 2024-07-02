import { Reader } from "../../reader"

export const createNavigator = (reader: Reader) => {
  const goToNextSpineItem = () => {
    const focusedSpineItemIndex =
      reader.spineItemManager.getFocusedSpineItemIndex() || 0
    const { end = focusedSpineItemIndex } =
      reader.spine.locator.getSpineItemsFromReadingOrderPosition(
        reader.viewportNavigator.getCurrentNavigationPosition(),
      ) || {}
    const numberOfSpineItems = reader.context.manifest?.spineItems.length ?? 0
    const nextItem = end + 1
    if (nextItem < numberOfSpineItems) {
      reader.viewportNavigator.goToSpineItem(nextItem)
    }
  }

  const goToPreviousSpineItem = () => {
    const focusedSpineItemIndex =
      reader.spineItemManager.getFocusedSpineItemIndex() || 0
    const { begin = focusedSpineItemIndex } =
      reader.spine.locator.getSpineItemsFromReadingOrderPosition(
        reader.viewportNavigator.getCurrentNavigationPosition(),
      ) || {}
    const nextItem = begin - 1

    if (nextItem >= 0) {
      reader.viewportNavigator.goToSpineItem(nextItem)
    }
  }

  return {
    goToNextSpineItem,
    goToPreviousSpineItem,
    goToLeftSpineItem: () => {
      if (reader.settings.settings.computedPageTurnDirection === "vertical")
        return

      if (reader.context.isRTL()) {
        return goToNextSpineItem()
      }

      return goToPreviousSpineItem()
    },
    goToRightSpineItem: () => {
      if (reader.settings.settings.computedPageTurnDirection === "vertical")
        return

      if (reader.context.isRTL()) {
        return goToPreviousSpineItem()
      }

      return goToNextSpineItem()
    },
  }
}
