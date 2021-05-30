import { extractObokuMetadataFromCfi } from "../cfi"
import { Context } from "../context"
import { createLocator } from "../readingItem/locator"
import { ReadingItemManager } from "../readingItemManager"

export const createCfiHelper = ({ readingItemManager, context }: {
  readingItemManager: ReadingItemManager,
  context: Context
}) => {
  const readingItemLocator = createLocator({ context })

  const getReadingItemFromCfi = (cfi: string) => {
    const { itemId } = extractObokuMetadataFromCfi(cfi)
    if (itemId) {
      const { itemId } = extractObokuMetadataFromCfi(cfi)
      const readingItem = (itemId ? readingItemManager.get(itemId) : undefined) || readingItemManager.get(0)
      
      return readingItem
    }
    return undefined
  }

  const getCfiInformation = (cfi: string) => {
    const readingItem = getReadingItemFromCfi(cfi)

    if (readingItem) {
      const position = readingItemLocator.getReadingItemPositionFromCfi(cfi, readingItem)
      const pageIndex = position ? readingItemLocator.getReadingItemPageIndexFromPosition(position, readingItem) : undefined
      
      return {
        readingItemIndex: readingItemManager.getReadingItemIndex(readingItem),
        pageIndex
      }
    }

    return undefined
  }

  return {
    getReadingItemFromCfi,
    getCfiInformation,
  }
}