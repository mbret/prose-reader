import { CFI, extractObokuMetadataFromCfi } from "../cfi"
import { Context } from "../context"
import { createLocator } from "../readingItem/locator"
import { ReadingItemManager } from "../readingItemManager"
import { Manifest } from "../types"

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

  const getCfiMetaInformation = (cfi: string) => {
    const readingItem = getReadingItemFromCfi(cfi)

    if (readingItem) {
      return {
        readingItemIndex: readingItemManager.getReadingItemIndex(readingItem),
      }
    }

    return undefined
  }

  const resolveCfi = (cfi: string) => {
    const { readingItemIndex = -1 } = getCfiMetaInformation(cfi) || {}
    const readingItem = readingItemManager.get(readingItemIndex)

    if (readingItem) {
      let position: { x: number, y: number } | undefined = undefined
      const { node, offset = 0 } = readingItemLocator.resolveCfi(cfi, readingItem) || {}
      if (node) {
        position = readingItemLocator.getReadingItemPositionFromNode(node, offset, readingItem)
      }
      const pageIndex = position ? readingItemLocator.getReadingItemPageIndexFromPosition(position, readingItem) : undefined

      return {
        readingItemIndex,
        pageIndex,
        node,
        offset,
      }
    }

    return undefined
  }

  /**
   * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
   * so we use two cfi for start and end.
   */
  const generateFromRange = ({ startNode, start, end, endNode }: { startNode: Node, start: number, endNode: Node, end: number }, item: Manifest['readingOrder'][number]) => {
    const startCFI = CFI.generate(startNode, start, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)
    const endCFI = CFI.generate(endNode, end, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)

    return { start: startCFI, end: endCFI }
  }

  return {
    getReadingItemFromCfi,
    getCfiMetaInformation,
    resolveCfi,
    generateFromRange,
  }
}