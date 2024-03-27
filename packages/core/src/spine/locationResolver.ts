import { Context } from "../context/context"
import { SpineItem } from "../spineItem/createSpineItem"
import { createLocationResolver as createSpineItemLocator } from "../spineItem/locationResolver"
import { SpineItemManager } from "../spineItemManager"
import { Report } from "../report"
import { SpineItemNavigationPosition, SpineItemPosition, UnsafeSpineItemPosition } from "../spineItem/types"
import { SpinePosition, UnsafeSpinePosition } from "./types"
import { Settings } from "../settings/settings"

export const createLocationResolver = ({
  spineItemManager,
  context,
  spineItemLocator,
  settings
}: {
  spineItemManager: SpineItemManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
  settings: Settings
}) => {
  const getSpineItemPositionFromSpinePosition = Report.measurePerformance(
    `getSpineItemPositionFromSpinePosition`,
    10,
    (position: UnsafeSpinePosition, spineItem: SpineItem): UnsafeSpineItemPosition => {
      const { left, top } = spineItemManager.getAbsolutePositionOf(spineItem)

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

      return {
        /**
         * when using spread the item could be on the right and therefore will be negative
         * @example
         * 400 (position = viewport), page of 200
         * 400 - 600 = -200.
         * However we can assume we are at 0, because we in fact can see the beginning of the item
         */
        x: position.x - left,
        y: position.y - top,
      }
    },
    { disable: true },
  )

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
  const getSpinePositionFromSpineItemPosition = (
    spineItemPosition: SpineItemNavigationPosition | SpineItemPosition,
    spineItem: SpineItem,
  ): SpinePosition => {
    const { left, top } = spineItemManager.getAbsolutePositionOf(spineItem)

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

    return {
      x: left + spineItemPosition.x,
      y: top + spineItemPosition.y,
    }
  }

  /**
   * This will retrieve the closest item to the x / y position edge relative to the reading direction.
   */
  const getSpineItemFromPosition = Report.measurePerformance(
    `getSpineItemFromOffset`,
    10,
    (position: UnsafeSpinePosition) => {
      const spineItem = spineItemManager.getAll().find((item) => {
        const { left, right, bottom, top } = spineItemManager.getAbsolutePositionOf(item)

        const isWithinXAxis = position.x >= left && position.x < right

        if (settings.getSettings().computedPageTurnDirection === `horizontal`) {
          return isWithinXAxis
        } else {
          return isWithinXAxis && position.y >= top && position.y < bottom
        }
      })

      if (position.x === 0 && !spineItem) {
        return spineItemManager.getAll()[0]
      }

      return spineItem
    },
    { disable: true },
  )

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({ x: 0, y: 0 }, spineItem)
  }

  const getSpinePositionFromSpineItemAnchor = (anchor: string, spineItem: SpineItem) => {
    const spineItemOffset = spineItemLocator.getSpineItemOffsetFromAnchor(anchor, spineItem)

    const position = getSpinePositionFromSpineItemPosition({ x: spineItemOffset, y: 0 }, spineItem)

    return position
  }

  const getSpineItemsFromReadingOrderPosition = (
    position: SpinePosition,
  ):
    | {
        begin: number
        beginPosition: SpinePosition
        end: number
        endPosition: SpinePosition
      }
    | undefined => {
    const itemAtPosition = getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()
    const itemAtPositionIndex = spineItemManager.getSpineItemIndex(itemAtPosition)

    if (itemAtPositionIndex === undefined) return undefined

    let endPosition = position

    if (context.isUsingSpreadMode()) {
      endPosition = { x: position.x + context.getPageSize().width, y: position.y }
    }

    const endItemIndex =
      spineItemManager.getSpineItemIndex(getSpineItemFromPosition(endPosition) || spineItemManager.getFocusedSpineItem()) ??
      itemAtPositionIndex

    /**
     * This sort is a quick trick to always order correctly and thus simplify when dealing with ltr/rtl
     */
    const items = [
      { item: itemAtPositionIndex, position },
      { item: endItemIndex, position: endPosition },
    ] as [{ item: number; position: typeof position }, { item: number; position: typeof position }]
    const [begin, end] = items.sort((a, b) => {
      // if we have same item index, we sort by position number
      if (a.item === b.item) {
        return context.isRTL() ? b.position.x - a.position.x : a.position.x - b.position.x
      }

      return a.item - b.item
    })

    return {
      begin: begin.item,
      beginPosition: begin.position,
      end: end.item,
      endPosition: end.position,
    }
  }

  const getSpineItemFromIframe = (iframe: Element) => {
    return spineItemManager.getAll().find((item) => item.spineItemFrame.getFrameElement() === iframe)
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
    getSpineItemsFromReadingOrderPosition,
  }
}
