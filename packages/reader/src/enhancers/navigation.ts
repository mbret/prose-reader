/**
 * Offer extra convenient methods for navigation.
 */
import { Enhancer } from "../createReader"

export const navigationEnhancer: Enhancer<{
  goToLeftSpineItem: () => void,
  goToRightSpineItem: () => void,
}> = (next) => (options) => {
  const reader = next(options)

  const goToNextSpineItem = () => {
    const focusedReadingItemIndex = reader.getFocusedReadingItemIndex() || 0
    const { end = focusedReadingItemIndex } = reader.locator.getReadingItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
    const numberOfSpineItems = reader.context.getManifest()?.readingOrder.length ?? 0
    const nextItem = end + 1
    if (nextItem < numberOfSpineItems) {
      reader.goToSpineItem(nextItem)
    }
  }

  const goToPreviousSpineItem = () => {
    const focusedReadingItemIndex = reader.getFocusedReadingItemIndex() || 0
    const { begin = focusedReadingItemIndex } = reader.locator.getReadingItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
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
