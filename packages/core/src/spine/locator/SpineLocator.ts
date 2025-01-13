import type { Context } from "../../context/Context"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { createSpineItemLocator } from "../../spineItem/locationResolver"
import type { SpineItemsManager } from "../SpineItemsManager"
import { Report } from "../../report"
import type {
  SafeSpineItemPosition,
  UnsafeSpineItemPosition,
} from "../../spineItem/types"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpinePositionFromSpineItemPosition } from "./getSpinePositionFromSpineItemPosition"
import type { SpineLayout } from "../SpineLayout"
import { getSpineInfoFromAbsolutePageIndex } from "./getSpineInfoFromAbsolutePageIndex"
import { getAbsolutePageIndexFromPageIndex } from "./getAbsolutePageIndexFromPageIndex"

export type SpineLocator = ReturnType<typeof createSpineLocator>

export const createSpineLocator = ({
  spineItemsManager,
  context,
  spineItemLocator,
  settings,
  spineLayout,
}: {
  spineItemsManager: SpineItemsManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
  settings: ReaderSettingsManager
  spineLayout: SpineLayout
}) => {
  const getSpineItemPositionFromSpinePosition = Report.measurePerformance(
    `getSpineItemPositionFromSpinePosition`,
    10,
    (
      position: ViewportPosition,
      spineItem: SpineItem,
    ): UnsafeSpineItemPosition => {
      const { left, top } = spineLayout.getAbsolutePositionOf(spineItem)

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

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({
      spineItemPosition: { x: 0, y: 0 },
      itemLayout: spineLayout.getAbsolutePositionOf(spineItem),
    })
  }

  const getSpineItemFromIframe = (iframe: Element) => {
    return spineItemsManager.items.find((item) => {
      const element = item.renderer.getDocumentFrame()

      return element === iframe
    })
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number | undefined,
    spineItemOrIndex: SpineItem | number,
  ) => {
    if (typeof spineItemOrIndex === "number") {
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
        spineItemLocator.getSpineItemPositionFromPageIndex({
          pageIndex: index,
          isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
          itemLayout: spineItem.getElementDimensions(),
        })

      const spinePosition = getSpinePositionFromSpineItemPosition({
        spineItemPosition,
        itemLayout: spineLayout.getAbsolutePositionOf(spineItem),
      })

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
      spineLayout.getAbsolutePositionOf(spineItem)

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
    const { height, width } = spineLayout.getAbsolutePositionOf(spineItem)

    return {
      x: Math.min(Math.max(0, unsafePosition.x), width),
      y: Math.min(Math.max(0, unsafePosition.y), height),
    }
  }

  return {
    getSpinePositionFromSpineItemPosition: ({
      spineItem,
      spineItemPosition,
    }: {
      spineItemPosition: SafeSpineItemPosition
      spineItem: SpineItem
    }) => {
      const itemLayout = spineLayout.getAbsolutePositionOf(spineItem)

      return getSpinePositionFromSpineItemPosition({
        itemLayout,
        spineItemPosition,
      })
    },
    getAbsolutePageIndexFromPageIndex: (
      params: Omit<
        Parameters<typeof getAbsolutePageIndexFromPageIndex>[0],
        "context" | "settings" | "spineLayout" | "spineItemsManager"
      >,
    ) =>
      getAbsolutePageIndexFromPageIndex({
        ...params,
        context,
        settings,
        spineItemsManager,
        spineLayout,
      }),
    getSpineInfoFromAbsolutePageIndex: (
      params: Omit<
        Parameters<typeof getSpineInfoFromAbsolutePageIndex>[0],
        "context" | "settings" | "spineLayout" | "spineItemsManager"
      >,
    ) =>
      getSpineInfoFromAbsolutePageIndex({
        ...params,
        context,
        settings,
        spineItemsManager,
        spineLayout,
      }),
    getSpinePositionFromSpineItem,
    getSpineItemPositionFromSpinePosition,
    getSpineItemFromPosition: (position: ViewportPosition) =>
      getSpineItemFromPosition({
        position,
        settings,
        spineItemsManager,
        spineLayout,
      }),
    getSpineItemFromIframe,
    getSpineItemPageIndexFromNode,
    getVisibleSpineItemsFromPosition: (
      params: Omit<
        Parameters<typeof getVisibleSpineItemsFromPosition>[0],
        "context" | "spineItemsManager" | "settings" | "spineLayout"
      >,
    ) =>
      getVisibleSpineItemsFromPosition({
        context,
        settings,
        spineItemsManager,
        spineLayout,
        ...params,
      }),
    getVisiblePagesFromViewportPosition,
    isPositionWithinSpineItem,
    spineItemLocator,
    getSafeSpineItemPositionFromUnsafeSpineItemPosition,
  }
}
