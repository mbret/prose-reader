import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { getRangeFromNode } from "../utils/dom"
import type { SpineItem } from "./SpineItem"
import { getClosestValidOffsetFromApproximateOffsetInPages } from "./helpers"
import { getSpineItemNumberOfPages } from "./layout/getSpineItemNumberOfPages"
import { getSpineItemPositionFromPageIndex } from "./layout/getSpineItemPositionFromPageIndex"
import { SpineItemPosition } from "./types"

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
    spineItemPosition: SpineItemPosition
    itemWidth: number
    itemHeight: number
  }): SpineItemPosition =>
    new SpineItemPosition({
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
    position: SpineItemPosition
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
    }
    const pageIndex = getPageFromOffset(offset, pageWidth, numberOfPages)

    return pageIndex
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

    const spineItemWidth = spineItem.layout.layoutInfo?.width || 0
    const pageWidth = context.getPageSize().width

    if (offsetOfNodeInSpineItem !== undefined) {
      const val = getClosestValidOffsetFromApproximateOffsetInPages(
        offsetOfNodeInSpineItem,
        pageWidth,
        spineItemWidth,
      )

      // @todo vertical
      return new SpineItemPosition({ x: val, y: 0 })
    }

    return undefined
  }

  const getSpineItemClosestPositionFromUnsafePosition = (
    unsafePosition: SpineItemPosition,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.layout.layoutInfo

    const adjustedPosition = new SpineItemPosition({
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
    })

    return adjustedPosition
  }

  const getSpineItemPageIndexFromNode = (
    node: Node,
    offset: number,
    spineItem: SpineItem,
  ) => {
    const position = getSpineItemPositionFromNode(node, offset, spineItem)
    const { height, width } = spineItem.layout.layoutInfo

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
      spineItem,
    }: {
      pageIndex: number
      spineItem: SpineItem
    }) =>
      getSpineItemPositionFromPageIndex({
        context,
        isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
        itemLayout: spineItem.layout.layoutInfo,
        pageIndex,
      }),
    getSpineItemPageIndexFromPosition,
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
  }
}
