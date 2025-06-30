import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { createSpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemPosition } from "../../spineItem/types"
import type { Viewport } from "../../viewport/Viewport"
import { translateSpinePositionToRelativeViewport } from "../../viewport/translateSpinePositionToRelativeViewport"
import { ViewportSlicePosition } from "../../viewport/types"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"
import type { SpinePosition, UnsafeSpinePosition } from "../types"
import { getAbsolutePageIndexFromPageIndex } from "./getAbsolutePageIndexFromPageIndex"
import { getItemVisibilityForPosition } from "./getItemVisibilityForPosition"
import { getSpineInfoFromAbsolutePageIndex } from "./getSpineInfoFromAbsolutePageIndex"
import { getSpineItemFromPosition } from "./getSpineItemFromPosition"
import { getSpinePositionFromSpineItemPosition } from "./getSpinePositionFromSpineItemPosition"
import { getVisibleSpineItemsFromPosition } from "./getVisibleSpineItemsFromPosition"

export type SpineLocator = ReturnType<typeof createSpineLocator>

export const createSpineLocator = ({
  spineItemsManager,
  context,
  spineItemLocator,
  settings,
  spineLayout,
  viewport,
}: {
  spineItemsManager: SpineItemsManager
  context: Context
  spineItemLocator: ReturnType<typeof createSpineItemLocator>
  settings: ReaderSettingsManager
  spineLayout: SpineLayout
  viewport: Viewport
}) => {
  const getSpineItemPositionFromSpinePosition = (
    position: SpinePosition | UnsafeSpinePosition,
    spineItem: SpineItem,
  ): SpineItemPosition => {
    const { left, top } = spineLayout.getSpineItemSpineLayoutInfo(spineItem)

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

    return new SpineItemPosition({
      /**
       * when using spread the item could be on the right and therefore will be negative
       * @example
       * 400 (position = viewport), page of 200
       * 400 - 600 = -200.
       * However we can assume we are at 0, because we in fact can see the beginning of the item
       */
      x: Math.max(position.x - left, 0),
      y: Math.max(position.y - top, 0),
    })
  }

  const getSpinePositionFromSpineItem = (spineItem: SpineItem) => {
    return getSpinePositionFromSpineItemPosition({
      spineItemPosition: new SpineItemPosition({ x: 0, y: 0 }),
      itemLayout: spineLayout.getSpineItemSpineLayoutInfo(spineItem),
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
    useAbsoluteViewport = true,
    viewport,
  }: {
    position: SpinePosition
    threshold:
      | { type: "percentage"; value: number }
      | { type: "pixels"; value: number }
    spineItem: SpineItem
    restrictToScreen?: boolean
    useAbsoluteViewport?: boolean
    viewport: Viewport
  }):
    | {
        beginPageIndex: number
        endPageIndex: number
      }
    | undefined => {
    const numberOfPages = spineItem.numberOfPages

    const pages = Array.from(Array(numberOfPages)).map((_, index) => {
      const spineItemPosition =
        spineItemLocator.getSpineItemPositionFromPageIndex({
          pageIndex: index,
          spineItem,
        })

      const spinePosition = getSpinePositionFromSpineItemPosition({
        spineItemPosition,
        itemLayout: spineLayout.getSpineItemSpineLayoutInfo(spineItem),
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
        const viewportInfo = useAbsoluteViewport
          ? viewport.absoluteViewport
          : viewport.relativeViewport

        const relativeSpinePosition = translateSpinePositionToRelativeViewport(
          position,
          viewport.absoluteViewport,
          viewportInfo,
        )

        const viewportPosition = ViewportSlicePosition.from(
          relativeSpinePosition,
          viewportInfo,
        )

        const { visible } = getItemVisibilityForPosition({
          viewportPosition,
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
    position: ViewportSlicePosition | SpinePosition,
    spineItem: SpineItem,
  ) => {
    const { bottom, left, right, top } =
      spineLayout.getSpineItemSpineLayoutInfo(spineItem)

    return (
      position.x >= left &&
      position.x <= right &&
      position.y <= bottom &&
      position.y >= top
    )
  }

  // @todo move into spine item locator
  const getSafeSpineItemPositionFromUnsafeSpineItemPosition = (
    unsafePosition: SpineItemPosition,
    spineItem: SpineItem,
  ): SpineItemPosition => {
    const { height, width } = spineLayout.getSpineItemSpineLayoutInfo(spineItem)

    return new SpineItemPosition({
      x: Math.min(Math.max(0, unsafePosition.x), width),
      y: Math.min(Math.max(0, unsafePosition.y), height),
    })
  }

  const getSpineItemPagePositionFromSpinePosition = (
    spinePosition: UnsafeSpinePosition | SpinePosition,
  ) => {
    const spineItem = getSpineItemFromPosition({
      position: spinePosition,
      spineItemsManager,
      spineLayout,
    })

    if (!spineItem) {
      return undefined
    }

    const spineItemPosition = getSpineItemPositionFromSpinePosition(
      spinePosition,
      spineItem,
    )

    const spineItemPageIndex =
      spineItemLocator.getSpineItemPageIndexFromPosition({
        itemWidth: spineItem.layout.layoutInfo.width,
        itemHeight: spineItem.layout.layoutInfo.height,
        position: spineItemPosition,
        isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      })

    const spineItemPagePosition =
      spineItemLocator.getSpineItemPagePositionFromSpineItemPosition(
        spineItemPosition,
        spineItemPageIndex,
        spineItem,
      )

    return {
      spineItem,
      spineItemPageIndex,
      spineItemPagePosition,
      pageSize: viewport.value.pageSize,
    }
  }

  return {
    getSpinePositionFromSpineItemPosition: ({
      spineItem,
      spineItemPosition,
    }: {
      spineItemPosition: SpineItemPosition
      spineItem: SpineItem
    }) => {
      const itemLayout = spineLayout.getSpineItemSpineLayoutInfo(spineItem)

      return getSpinePositionFromSpineItemPosition({
        itemLayout,
        spineItemPosition,
      })
    },
    /**
     * @deprecated use Pages
     */
    _getAbsolutePageIndexFromPageIndex: (
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
    getSpineItemPagePositionFromSpinePosition,
    getSpinePositionFromSpineItem,
    getSpineItemPositionFromSpinePosition,
    getSpineItemFromPosition: (position: SpinePosition) =>
      getSpineItemFromPosition({
        position,
        spineItemsManager,
        spineLayout,
      }),
    getSpineItemFromIframe,
    getSpineItemPageIndexFromNode,
    getVisibleSpineItemsFromPosition: (
      params: Omit<
        Parameters<typeof getVisibleSpineItemsFromPosition>[0],
        "spineItemsManager" | "settings" | "spineLayout" | "viewport"
      >,
    ) =>
      getVisibleSpineItemsFromPosition({
        settings,
        spineItemsManager,
        spineLayout,
        viewport,
        ...params,
      }),
    getVisiblePagesFromViewportPosition: (
      params: Omit<
        Parameters<typeof getVisiblePagesFromViewportPosition>[0],
        "viewport"
      >,
    ) =>
      getVisiblePagesFromViewportPosition({
        ...params,
        viewport,
      }),
    isPositionWithinSpineItem,
    spineItemLocator,
    getSafeSpineItemPositionFromUnsafeSpineItemPosition,
  }
}
