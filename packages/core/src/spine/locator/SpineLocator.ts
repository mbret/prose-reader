import { Context } from "../../context/Context"
import { SpineItem } from "../../spineItem/createSpineItem"
import { createSpineItemLocator as createSpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemsManager } from "../SpineItemsManager"
import { Report } from "../../report"
import {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../spineItem/types"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { ViewportPosition } from "../../navigation/ViewportNavigator"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"

export type SpineLocator = ReturnType<
  typeof createSpineLocator
>

export const createSpineLocator = ({
  spineItemsManager,
  context,
  spineItemLocator,
  settings,
}: {
  spineItemsManager: SpineItemsManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
  settings: ReaderSettingsManager
}) => {
  const getSpineItemPositionFromSpinePosition = Report.measurePerformance(
    `getSpineItemPositionFromSpinePosition`,
    10,
    (
      position: ViewportPosition,
      spineItem: SpineItem,
    ): UnsafeSpineItemPosition => {
      const { left, top } = spineItemsManager.getAbsolutePositionOf(spineItem)

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
        x: Math.max(position.x - left, 0),
        y: Math.max(position.y - top, 0),
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
    spineItemPosition: SafeSpineItemPosition,
    spineItem: SpineItem,
  ): ViewportPosition => {
    const { left, top } = spineItemsManager.getAbsolutePositionOf(spineItem)

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

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({ x: 0, y: 0 }, spineItem)
  }

  const getSpineItemFromIframe = (iframe: Element) => {
    return spineItemsManager
      .items
      .find((item) => item.frame.getFrameElement() === iframe)
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number | undefined,
    spineItemOrIndex: SpineItem | number,
  ) => {
    if (typeof spineItemOrIndex === `number`) {
      const spineItem = spineItemsManager.get(spineItemOrIndex)
      return spineItem
        ? spineItemLocator.getSpineItemPageIndexFromNode(
            node,
            offset || 0,
            spineItem,
          )
        : undefined
    }

    return spineItemLocator.getSpineItemPageIndexFromNode(
      node,
      offset || 0,
      spineItemOrIndex,
    )
  }

  const getVisiblePagesFromViewportPosition = ({
    position,
    threshold,
    spineItem,
    restrictToScreen,
  }: {
    position: ViewportPosition
    threshold: number
    spineItem: SpineItem
    restrictToScreen?: boolean
  }):
    | {
        beginPageIndex: number
        endPageIndex: number
      }
    | undefined => {
    const { height, width } = spineItem.getElementDimensions()
    const numberOfPages = spineItemLocator.getSpineItemNumberOfPages({
      isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      itemHeight: height,
      itemWidth: width,
    })

    const pages = Array.from(Array(numberOfPages)).map((_, index) => {
      const spineItemPosition =
        spineItemLocator.getSpineItemPositionFromPageIndex(index, spineItem)

      const spinePosition = getSpinePositionFromSpineItemPosition(
        spineItemPosition,
        spineItem,
      )

      return {
        index,
        absolutePosition: {
          width: context.getPageSize().width,
          height: context.getPageSize().height,
          left: spinePosition.x,
          top: spinePosition.y,
          bottom: spinePosition.y + context.getPageSize().height,
          right: spinePosition.x + context.getPageSize().width,
        },
      }
    })

    const pagesVisible = pages.reduce<number[]>(
      (acc, { absolutePosition, index }) => {
        const { visible } = getItemVisibilityForPosition({
          context,
          viewportPosition: position,
          restrictToScreen,
          threshold,
          itemPosition: absolutePosition,
        })

        if (visible) {
          return [...acc, index]
        }

        return acc
      },
      [],
    )

    const beginPageIndex = pagesVisible[0]
    const endPageIndex = pagesVisible[pagesVisible.length - 1] ?? beginPageIndex

    if (beginPageIndex === undefined || endPageIndex === undefined)
      return undefined

    return {
      beginPageIndex,
      endPageIndex,
    }
  }

  const isPositionWithinSpineItem = (
    position: ViewportPosition,
    spineItem: SpineItem,
  ) => {
    const { bottom, left, right, top } =
      spineItemsManager.getAbsolutePositionOf(spineItem)

    return (
      position.x >= left &&
      position.x <= right &&
      position.y <= bottom &&
      position.y >= top
    )
  }

  // @todo move into spine item locator
  const getSafeSpineItemPositionFromUnsafeSpineItemPosition = (
    unsafePosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ): SafeSpineItemPosition => {
    const { height, width } = spineItemsManager.getAbsolutePositionOf(spineItem)

    return {
      x: Math.min(Math.max(0, unsafePosition.x), width),
      y: Math.min(Math.max(0, unsafePosition.y), height),
    }
  }

  return {
    getSpinePositionFromSpineItemPosition,
    getSpinePositionFromSpineItem,
    getSpineItemPositionFromSpinePosition,
    getSpineItemFromPosition: (position: ViewportPosition) =>
      getSpineItemFromPosition({
        position,
        settings,
        spineItemsManager,
      }),
    getSpineItemFromIframe,
    getSpineItemPageIndexFromNode,
    getVisibleSpineItemsFromPosition: (
      params: Omit<
        Parameters<typeof getVisibleSpineItemsFromPosition>[0],
        "context" | "spineItemsManager" | "settings"
      >,
    ) =>
      getVisibleSpineItemsFromPosition({
        context,
        settings,
        spineItemsManager,
        ...params,
      }),
    getVisiblePagesFromViewportPosition,
    isPositionWithinSpineItem,
    spineItemLocator,
    getSafeSpineItemPositionFromUnsafeSpineItemPosition,
  }
}
