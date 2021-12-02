import { Context } from "../context"
import { SpineItem } from "../spineItem/createSpineItem"
import { createLocationResolver as createSpineItemLocator } from "../spineItem/locationResolver"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"

type SpinePosition = { x: number, y: number }
type SpineItemPosition = { x: number, y: number, outsideOfBoundaries?: boolean }

export const createLocationResolver = ({ spineItemManager, context, spineItemLocator }: {
  spineItemManager: SpineItemManager,
  context: Context,
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
}) => {
  const getSpineItemPositionFromSpinePosition = Report.measurePerformance(`getSpineItemPositionFromSpinePosition`, 10, (position: SpinePosition, spineItem: SpineItem): SpineItemPosition => {
    const { leftEnd, leftStart, topStart, topEnd } = spineItemManager.getAbsolutePositionOf(spineItem)

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
      return {
        x: (leftEnd - position.x) - context.getPageSize().width,
        // y: (topEnd - position.y) - context.getPageSize().height,
        y: Math.max(0, position.y - topStart)
      }
    }

    return {
      /**
       * when using spread the item could be on the right and therefore will be negative
       * @example
       * 400 (position = viewport), page of 200
       * 400 - 600 = -200.
       * However we can assume we are at 0, because we in fact can see the beginning of the item
       */
      x: Math.max(0, position.x - leftStart),
      y: Math.max(0, position.y - topStart)
    }
  }, { disable: true })

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
  const getSpinePositionFromSpineItemPosition = (spineItemPosition: SpineItemPosition, spineItem: SpineItem): SpinePosition => {
    const { leftEnd, leftStart, topStart, topEnd } = spineItemManager.getAbsolutePositionOf(spineItem)

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
    //   return (end - spineItemOffset) - context.getPageSize().width
    // }

    if (context.isRTL()) {
      return {
        x: (leftEnd - spineItemPosition.x) - context.getPageSize().width,
        // y: (topEnd - spineItemPosition.y) - context.getPageSize().height,
        y: topStart + spineItemPosition.y
      }
    }

    return {
      x: leftStart + spineItemPosition.x,
      y: topStart + spineItemPosition.y
    }
  }

  /**
   * This will retrieve the closest item to the x / y position edge relative to the reading direction.
   */
  const getSpineItemFromPosition = Report.measurePerformance(`getSpineItemFromOffset`, 10, (position: SpinePosition) => {
    const spineItem = spineItemManager.getSpineItemAtPosition(position)

    return spineItem
  }, { disable: true })

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({ x: 0, y: 0 }, spineItem)
  }

  const getSpinePositionFromSpineItemAnchor = (anchor: string, spineItem: SpineItem) => {
    const spineItemOffset = spineItemLocator.getSpineItemOffsetFromAnchor(anchor, spineItem)

    const position = getSpinePositionFromSpineItemPosition({ x: spineItemOffset, y: 0 }, spineItem)

    return position
  }

  const getSpineItemsFromReadingOrderPosition = (position: SpinePosition): {
    left: number,
    right: number,
    begin: number,
    beginPosition: SpinePosition
    end: number
    endPosition: SpinePosition
  } | undefined => {
    const beginItem = getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()
    const beginItemIndex = spineItemManager.getSpineItemIndex(beginItem)

    if (beginItemIndex === undefined) return undefined

    let endPosition = position

    if (context.shouldDisplaySpread()) {
      endPosition = { x: position.x + context.getPageSize().width, y: position.y }
    }

    const endItemIndex = spineItemManager.getSpineItemIndex(
      getSpineItemFromPosition(endPosition) || spineItemManager.getFocusedSpineItem()
    ) ?? beginItemIndex

    const [left = beginItemIndex, right = beginItemIndex] = [beginItemIndex, endItemIndex].sort((a, b) => a - b)
    // const [left = beginItemIndex, right = beginItemIndex] = [beginItemIndex, endItemIndex].sort()

    return {
      begin: beginItemIndex,
      beginPosition: position,
      end: endItemIndex,
      endPosition: endPosition,
      left,
      right
    }
  }

  const getSpineItemFromIframe = (iframe: Element) => {
    return spineItemManager.getAll().find(item => item.spineItemFrame.getFrameElement() === iframe)
  }

  const getSpineItemPageIndexFromNode = (node: Node, offset: number | undefined, spineItemOrIndex: SpineItem | number) => {
    if (typeof spineItemOrIndex === `number`) {
      const spineItem = spineItemManager.get(spineItemOrIndex)
      return spineItem ? spineItemLocator.getSpineItemPageIndexFromNode(node, offset || 0, spineItem) : undefined
    }

    return spineItemLocator.getSpineItemPageIndexFromNode(node, offset || 0, spineItemOrIndex)
  }

  return {
    getSpinePositionFromSpineItemPosition,
    getSpinePositionFromSpineItem,
    getSpinePositionFromSpineItemAnchor,
    getSpineItemPositionFromSpinePosition,
    getSpineItemFromPosition,
    getSpineItemFromIframe,
    getSpineItemPageIndexFromNode,
    getSpineItemsFromReadingOrderPosition
  }
}
