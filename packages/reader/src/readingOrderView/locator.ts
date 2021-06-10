import { Context } from "../context"
import { ReadingItem } from "../readingItem"
import { createLocator as createReadingItemLocator } from "../readingItem/locator"
import { ReadingItemManager } from "../readingItemManager"
import { Report } from "../report"

type ReadingOrderViewPosition = { x: number, y: number }
type ReadingItemPosition = { x: number, y: number, outsideOfBoundaries?: boolean }

export const createLocator = ({ readingItemManager, context }: {
  readingItemManager: ReadingItemManager,
  context: Context,
}) => {
  const readingItemLocator = createReadingItemLocator({ context })

  const getReadingItemRelativePositionFromReadingOrderViewPosition = Report.measurePerformance(`getReadingItemPositionFromReadingOrderViewPosition`, 10, (position: ReadingOrderViewPosition, readingItem: ReadingItem): ReadingItemPosition => {
    const { end, start, width } = readingItemManager.getAbsolutePositionOf(readingItem)

    /**
     * For this case the global offset move from right to left but this specific item
     * reads from left to right. This means that when the offset is at the start of the item
     * it is in fact at his end. This behavior can be observed in `haruko` about chapter.
     * @example
     * <---------------------------------------------------- global offset
     * item offset ------------------>
     * [item2 (page0 - page1 - page2)] [item1 (page1 - page0)] [item0 (page0)]
     */
    // if (context.isRTL() && itemReadingDirection === 'ltr') {
    //   return (end - readingOrderViewOffset) - context.getPageSize().width
    // }

    if (context.isRTL()) {
      return { x: (end - position.x) - context.getPageSize().width, y: position.y }
    }

    return {

      /**
       * when using spread the item could be on the right and therefore will be negative
       * @example 
       * 400 (position = viewport), page of 200
       * 400 - 600 = -200.
       * However we can assume we are at 0, because we in fact can see the beginning of the item
       */
      x: Math.max(0, position.x - start),
      y: position.y
    }
  })

  /**
   * Be careful when using with spread with RTL, this will return the position for one page size. This is in order to prevent wrong position when
   * an item is not taking the entire spread. That way we always have a valid position for the given item. However you need to adjust it
   * when on spread mode to be sure to position the viewport on the edge.
   * 
   * @example
   * [    item-a   |   item-a   ]
   * 400          200           0
   * will return 200, which probably needs to be adjusted as 0
   */
  const getReadingOrderViewPositionFromReadingItemPosition = (readingItemPosition: ReadingItemPosition, readingItem: ReadingItem): ReadingOrderViewPosition => {
    const { end, start } = readingItemManager.getAbsolutePositionOf(readingItem)

    /**
     * For this case the global offset move from right to left but this specific item
     * reads from left to right. This means that when the offset is at the start of the item
     * it is in fact at his end. This behavior can be observed in `haruko` about chapter.
     * @example
     * <---------------------------------------------------- global offset
     * item offset ------------------>
     * [item2 (page0 - page1 - page2)] [item1 (page1 - page0)] [item0 (page0)]
     */
    // if (context.isRTL() && itemReadingDirection === 'ltr') {
    //   return (end - readingItemOffset) - context.getPageSize().width
    // }

    if (context.isRTL()) {
      return {
        x: (end - readingItemPosition.x) - context.getPageSize().width,
        y: readingItemPosition.y
      }
    }

    return {
      x: start + readingItemPosition.x,
      y: readingItemPosition.y
    }
  }

  const getReadingItemFromOffset = Report.measurePerformance(`getReadingItemFromOffset`, 10, (x: number) => {
    const readingItem = readingItemManager.getReadingItemAtOffset(x)

    return readingItem
  }, { disable: true })

  const getReadingOrderViewOffsetFromReadingItem = (readingItem: ReadingItem) => {
    return getReadingOrderViewPositionFromReadingItemPosition({ x: 0, y: 0 }, readingItem)
  }

  const getReadingOrderViewPositionFromReadingOrderAnchor = (anchor: string, readingItem: ReadingItem) => {
    const readingItemOffset = readingItemLocator.getReadingItemOffsetFromAnchor(anchor, readingItem)

    const position = getReadingOrderViewPositionFromReadingItemPosition({ x: readingItemOffset, y: 0 }, readingItem)

    return position
  }

  const getReadingItemsFromReadingOrderPosition = (position: ReadingOrderViewPosition): {
    left: number,
    right: number,
    begin: number,
    beginPosition: ReadingOrderViewPosition
    end: number
    endPosition: ReadingOrderViewPosition
  } | undefined => {
    const beginItemIndex = readingItemManager.getReadingItemIndex(
      getReadingItemFromOffset(position.x)
    )

    if (beginItemIndex === undefined) return undefined

    let endPosition = position

    if (context.shouldDisplaySpread()) {
      endPosition = { x: position.x + context.getPageSize().width, y: position.y }
    }

    const endItemIndex = readingItemManager.getReadingItemIndex(
      getReadingItemFromOffset(endPosition.x)
    ) ?? beginItemIndex

    const [left = beginItemIndex, right = beginItemIndex] = [beginItemIndex, endItemIndex].sort()

    return {
      begin: beginItemIndex,
      beginPosition: position,
      end: endItemIndex,
      endPosition: endPosition,
      left,
      right
    }
  }

  const getReadingItemFromIframe = (iframe: Element) => {
    return readingItemManager.getAll().find(item => item.readingItemFrame.getFrameElement() === iframe)
  }

  return {
    getReadingOrderViewPositionFromReadingItemPosition,
    getReadingOrderViewOffsetFromReadingItem,
    getReadingItemRelativePositionFromReadingOrderViewPosition,
    getReadingItemFromOffset,
    getReadingOrderViewPositionFromReadingOrderAnchor,
    getReadingItemFromIframe,
    getReadingItemsFromReadingOrderPosition,
  }
}