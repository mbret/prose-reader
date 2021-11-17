import { CFI, extractObokuMetadataFromCfi } from "../cfi"
import { Context } from "../context"
import { ReadingItem } from "../spineItem"
import { createLocationResolver } from "../spineItem/locationResolver"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { Manifest } from "../types"

export const createCfiLocator = ({ spineItemManager, readingItemLocator }: {
  spineItemManager: SpineItemManager,
  context: Context,
  readingItemLocator: ReturnType<typeof createLocationResolver>
}) => {
  const getItemAnchor = (readingItem: ReadingItem) => `|[oboku~anchor~${encodeURIComponent(readingItem.item.id)}]`

  /**
   * Heavy cfi hookup. Use it to have a refined, precise cfi anchor. It requires the content to be loaded otherwise
   * it will return a root cfi.
   *
   * @todo optimize
   */
  const getCfi = Report.measurePerformance(`getCfi`, 10, (pageIndex: number, readingItem: ReadingItem) => {
    const nodeOrRange = readingItemLocator.getFirstNodeOrRangeAtPage(pageIndex, readingItem)
    const doc = readingItem.readingItemFrame.getManipulableFrame()?.frame?.contentWindow?.document

    const itemAnchor = getItemAnchor(readingItem)
    // because the current cfi library does not works well with offset we are just using custom
    // format and do it manually after resolving the node
    // @see https://github.com/fread-ink/epub-cfi-resolver/issues/8
    const offset = `|[oboku~offset~${nodeOrRange?.offset || 0}]`

    if (nodeOrRange && doc) {
      const cfiString = CFI.generate(nodeOrRange.node, 0, `${itemAnchor}${offset}`)

      return cfiString
    }

    return getRootCfi(readingItem)
  })

  /**
   * Very light cfi lookup. Use it when you need to anchor user to correct item
   * but do not want to have heavy dom lookup. This is useful as pre-cfi before the content
   * is loaded for example.
   */
  const getRootCfi = (readingItem: ReadingItem) => {
    const itemAnchor = getItemAnchor(readingItem)

    return `epubcfi(/0${itemAnchor}) `
  }

  const getReadingItemFromCfi = (cfi: string) => {
    const { itemId } = extractObokuMetadataFromCfi(cfi)

    if (itemId) {
      const { itemId } = extractObokuMetadataFromCfi(cfi)
      const readingItem = (itemId ? spineItemManager.get(itemId) : undefined) || spineItemManager.get(0)

      return readingItem
    }

    return undefined
  }

  const getCfiMetaInformation = (cfi: string) => {
    const readingItem = getReadingItemFromCfi(cfi)

    if (readingItem) {
      return {
        readingItemIndex: spineItemManager.getReadingItemIndex(readingItem)
      }
    }

    return undefined
  }

  /**
   * Returns the node and offset for the given cfi.
   */
  const resolveCfi = (cfiString: string) => {
    if (!cfiString) return undefined

    const readingItem = getReadingItemFromCfi(cfiString)
    const readingItemIndex = spineItemManager.getReadingItemIndex(readingItem) || 0

    if (!readingItem) return undefined

    const { cleanedCfi, offset } = extractObokuMetadataFromCfi(cfiString)
    const cfi = new CFI(cleanedCfi, {})

    const doc = readingItem.readingItemFrame.getManipulableFrame()?.frame?.contentWindow?.document

    if (doc) {
      try {
        const { node, offset: resolvedOffset } = cfi.resolve(doc, {})

        return { node, offset: offset ?? resolvedOffset, readingItemIndex }
      } catch (e) {
        Report.error(e)
        return undefined
      }
    }

    return undefined
  }

  // const resolveCfi = (cfi: string) => {
  //   const { readingItemIndex = -1 } = getCfiMetaInformation(cfi) || {}
  //   const readingItem = spineItemManager.get(readingItemIndex)

  //   if (readingItem) {
  //     let position: { x: number, y: number } | undefined = undefined
  //     const { node, offset = 0 } = readingItemLocator.resolveCfi(cfi, readingItem) || {}
  //     if (node) {
  //       position = readingItemLocator.getReadingItemPositionFromNode(node, offset, readingItem)
  //     }
  //     const pageIndex = position ? readingItemLocator.getReadingItemPageIndexFromPosition(position, readingItem) : undefined

  //     return {
  //       readingItemIndex,
  //       pageIndex,
  //       node,
  //       offset,
  //     }
  //   }

  //   return undefined
  // }

  /**
   * @todo the package does not support creating for range at the moment @see https://github.com/fread-ink/epub-cfi-resolver/issues/3
   * so we use two cfi for start and end.
   */
  const generateFromRange = ({ startNode, start, end, endNode }: { startNode: Node, start: number, endNode: Node, end: number }, item: Manifest[`spineItems`][number]) => {
    const startCFI = CFI.generate(startNode, start, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)
    const endCFI = CFI.generate(endNode, end, `|[oboku~anchor~${encodeURIComponent(item.id)}]`)

    return { start: startCFI, end: endCFI }
  }

  return {
    getReadingItemFromCfi,
    getCfiMetaInformation,
    getCfi,
    getRootCfi,
    resolveCfi,
    generateFromRange
  }
}
