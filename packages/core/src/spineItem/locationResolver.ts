import { Context } from "../context/Context"
import { getFirstVisibleNodeForViewport, getRangeFromNode } from "../utils/dom"
import { SafeSpineItemPosition, UnsafeSpineItemPosition } from "./types"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { getClosestValidOffsetFromApproximateOffsetInPages } from "./helpers"
import { getSpineItemNumberOfPages } from "./locator/getSpineItemNumberOfPages"
import { getSpineItemPositionFromPageIndex } from "./locator/getSpineItemPositionFromPageIndex"
import { getSpineItemPagesPosition } from "./locator/getSpineItemPagesPosition"
import { SpineItem } from "./SpineItem"

export type SpineItemLocator = ReturnType<typeof createSpineItemLocator>

export const createSpineItemLocator = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
  const getSafePosition = ({
    itemWidth,
    itemHeight,
    spineItemPosition,
  }: {
    spineItemPosition: UnsafeSpineItemPosition
    itemWidth: number
    itemHeight: number
  }): SafeSpineItemPosition => ({
    x: Math.min(itemWidth, Math.max(0, spineItemPosition.x)),
    y: Math.min(itemHeight, Math.max(0, spineItemPosition.y)),
  })

  /**
   * @important
   * This calculation takes blank page into account, the iframe could be only one page but with a blank page
   * positioned before. Resulting on two page index possible values (0 & 1).
   */
  const getSpineItemPageIndexFromPosition = ({
    itemWidth,
    itemHeight,
    position,
    isUsingVerticalWriting,
  }: {
    itemWidth: number
    itemHeight: number
    position: UnsafeSpineItemPosition
    isUsingVerticalWriting: boolean
  }) => {
    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height

    const safePosition = getSafePosition({
      spineItemPosition: position,
      itemHeight,
      itemWidth,
    })

    const offset = context.isRTL()
      ? itemWidth - safePosition.x - context.getPageSize().width
      : safePosition.x

    const numberOfPages = getSpineItemNumberOfPages({
      isUsingVerticalWriting,
      itemHeight,
      itemWidth,
      context,
      settings,
    })

    if (isUsingVerticalWriting) {
      return getPageFromOffset(position.y, pageHeight, numberOfPages)
    } else {
      const pageIndex = getPageFromOffset(offset, pageWidth, numberOfPages)

      return pageIndex
    }
  }

  const getSpineItemPositionFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    let offsetOfNodeInSpineItem: number | undefined

    // for some reason `img` does not work with range (x always = 0)
    if (
      node?.nodeName === `img` ||
      (node?.textContent === `` && node.nodeType === Node.ELEMENT_NODE)
    ) {
      offsetOfNodeInSpineItem = (node as HTMLElement).getBoundingClientRect().x
    } else if (node) {
      const range = node ? getRangeFromNode(node, offset) : undefined
      offsetOfNodeInSpineItem =
        range?.getBoundingClientRect().x || offsetOfNodeInSpineItem
    }

    const spineItemWidth = spineItem.getElementDimensions()?.width || 0
    const pageWidth = context.getPageSize().width

    if (offsetOfNodeInSpineItem !== undefined) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(
        offsetOfNodeInSpineItem,
        pageWidth,
        spineItemWidth,
      )

      // @todo vertical
      return { x: val, y: 0 }
    }

    return undefined
  }

  /**
   * @todo handle vertical
   */
  const getFirstNodeOrRangeAtPage = (
    pageIndex: number,
    spineItem: SpineItem,
  ) => {
    const pageSize = context.getPageSize()
    const frame = spineItem.renderer?.element

    if (
      frame instanceof HTMLIFrameElement &&
      frame?.contentWindow?.document &&
      // very important because it is being used by next functions
      frame.contentWindow.document.body !== null
    ) {
      // @todo handle vertical jp
      // top seems ok but left is not, it should probably not be 0 or something
      const { x: left, y: top } = getSpineItemPositionFromPageIndex({
        pageIndex,
        itemLayout: spineItem.getElementDimensions(),
        context,
        isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
      })
      const viewport = {
        left,
        right: left + pageSize.width,
        top,
        bottom: top + pageSize.height,
      }

      const res = getFirstVisibleNodeForViewport(
        frame.contentWindow.document,
        viewport,
      )

      return res
    }

    return undefined
  }

  const getSpineItemClosestPositionFromUnsafePosition = (
    unsafePosition: UnsafeSpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.getElementDimensions()

    const adjustedPosition = {
      x: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.x,
        context.getPageSize().width,
        width,
      ),
      y: getClosestValidOffsetFromApproximateOffsetInPages(
        unsafePosition.y,
        context.getPageSize().height,
        height,
      ),
    }

    return adjustedPosition
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const position = getSpineItemPositionFromNode(node, offset, spineItem)
    const { height, width } = spineItem.getElementDimensions()

    return position
      ? getSpineItemPageIndexFromPosition({
          isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
          position,
          itemHeight: height,
          itemWidth: width,
        })
      : undefined
  }

  const getPageFromOffset = (
    offset: number,
    pageWidth: number,
    numberOfPages: number,
  ) => {
    const offsetValues = [...Array(numberOfPages)].map((_, i) => i * pageWidth)

    if (offset <= 0) return 0

    if (offset >= numberOfPages * pageWidth) return numberOfPages - 1

    return Math.max(
      0,
      offsetValues.findIndex((offsetRange) => offset < offsetRange + pageWidth),
    )
  }

  return {
    getSpineItemPositionFromNode,
    getSpineItemPositionFromPageIndex: ({
      pageIndex,
      itemLayout,
      isUsingVerticalWriting,
    }: {
      pageIndex: number
      itemLayout: {
        width: number
        height: number
      }
      isUsingVerticalWriting: boolean
    }) =>
      getSpineItemPositionFromPageIndex({
        context,
        isUsingVerticalWriting,
        itemLayout,
        pageIndex,
      }),
    getSpineItemPageIndexFromPosition,
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getFirstNodeOrRangeAtPage,
    getSpineItemPagesPosition: ({ item }: { item: SpineItem }) => {
      return getSpineItemPagesPosition({
        context,
        isUsingVerticalWriting: !!item.isUsingVerticalWriting(),
        settings,
        itemLayout: item.getElementDimensions(),
      })
    },
    getSpineItemNumberOfPages: (params: {
      itemWidth: number
      itemHeight: number
      isUsingVerticalWriting: boolean
    }) =>
      getSpineItemNumberOfPages({
        context,
        settings,
        ...params,
      }),
  }
}
