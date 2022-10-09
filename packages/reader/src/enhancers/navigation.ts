/**
 * Offer extra convenient methods for navigation.
 */
import { Enhancer } from "./types"

export const navigationEnhancer: Enhancer<
  {},
  {
    goToLeftSpineItem: () => void
    goToRightSpineItem: () => void
  }
> = (next) => (options) => {
  const reader = next(options)

  const goToNextSpineItem = () => {
    const focusedSpineItemIndex = reader.getFocusedSpineItemIndex() || 0
    const { end = focusedSpineItemIndex } =
      reader.locator.getSpineItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
    const numberOfSpineItems = reader.context.getManifest()?.spineItems.length ?? 0
    const nextItem = end + 1
    if (nextItem < numberOfSpineItems) {
      reader.goToSpineItem(nextItem)
    }
  }

  const goToPreviousSpineItem = () => {
    const focusedSpineItemIndex = reader.getFocusedSpineItemIndex() || 0
    const { begin = focusedSpineItemIndex } =
      reader.locator.getSpineItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
    const nextItem = begin - 1
    if (nextItem >= 0) {
      reader.goToSpineItem(nextItem)
    }
  }

  return {
    ...reader,
    goToLeftSpineItem: () => {
      if (reader.context.isRTL()) {
        return goToNextSpineItem()
      }

      return goToPreviousSpineItem()
    },
    goToRightSpineItem: () => {
      if (reader.context.isRTL()) {
        return goToPreviousSpineItem()
      }

      return goToNextSpineItem()
    }
  }
}
