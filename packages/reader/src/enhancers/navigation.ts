import { Enhancer } from "../createReader";

export const navigationEnhancer: Enhancer<{
  goToLeftSpineItem: () => void,
  goToRightSpineItem: () => void,
}> = (next) => (options) => {
  const reader = next(options)

  const goToNextSpineItem = () => {
    const focusedReadingItemIndex = reader.getFocusedReadingItemIndex() || 0
    const { end = focusedReadingItemIndex } = reader.locator.getReadingItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
    const numberOfSpineItems = reader.context.getManifest()?.readingOrder.length ?? 0
    let nextItem = end + 1
    if (nextItem < numberOfSpineItems) {
      reader.goTo(nextItem)
    }
  }

  const goToPreviousSpineItem = () => {
    const focusedReadingItemIndex = reader.getFocusedReadingItemIndex() || 0
    const { begin = focusedReadingItemIndex } = reader.locator.getReadingItemsFromReadingOrderPosition(reader.getCurrentNavigationPosition()) || {}
    let nextItem = begin - 1
    if (nextItem >= 0) {
      reader.goTo(nextItem)
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
    },
    // goToPath: (path: string) => {
    //   const manifest = reader.context.manifest
    //   const foundItem = manifest?.readingOrder.find(item => item.path === path)
    //   if (foundItem) {
    //     reader.readingOrderView.goTo(foundItem.id)
    //   }
    // },
  }
}