import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { getRangeFromNode } from "../utils/dom"
import type { SpineItem } from "./SpineItem"
import {
  getClosestValidOffsetFromApproximateOffsetInPages,
  getItemOffsetFromPageIndex,
} from "./helpers"
import { getSpineItemPageIndexFromSpineItemPosition } from "./layout/getSpineItemPageIndexFromSpineItemPosition"
import { getSpineItemPositionFromPageIndex } from "./layout/getSpineItemPositionFromPageIndex"
import { SpineItemPosition, UnsafeSpineItemPagePosition } from "./types"

export type SpineItemLocator = ReturnType<typeof createSpineItemLocator>

export const createSpineItemLocator = ({
  context,
  settings,
}: {
  context: Context
  settings: ReaderSettingsManager
}) => {
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
      ? getSpineItemPageIndexFromSpineItemPosition({
          isUsingVerticalWriting: !!spineItem.isUsingVerticalWriting(),
          position,
          itemHeight: height,
          itemWidth: width,
          isRTL: context.isRTL(),
          pageWidth: context.getPageSize().width,
          pageHeight: context.getPageSize().height,
          pageTurnDirection: settings.values.computedPageTurnDirection,
          pageTurnMode: settings.values.pageTurnMode,
        })
      : undefined
  }

  const getSpineItemPagePositionFromSpineItemPosition = (
    position: SpineItemPosition,
    pageIndex: number,
    spineItem: SpineItem,
  ) => {
    const { width, height } = spineItem.layout.layoutInfo
    const pageWidth = context.getPageSize().width
    const pageHeight = context.getPageSize().height
    const isUsingVerticalWriting = !!spineItem.isUsingVerticalWriting()

    if (isUsingVerticalWriting) {
      // For vertical writing, pages stack vertically
      const pageStartY = getItemOffsetFromPageIndex(
        pageHeight,
        pageIndex,
        height,
      )
      return new UnsafeSpineItemPagePosition({
        x: position.x,
        y: position.y - pageStartY,
      })
    }

    // For horizontal writing
    const pageStartX = getItemOffsetFromPageIndex(pageWidth, pageIndex, width)

    if (context.isRTL()) {
      // For RTL, pages are positioned from right to left
      const rtlPageStartX = width - (pageIndex + 1) * pageWidth
      return new UnsafeSpineItemPagePosition({
        x: position.x - Math.max(0, rtlPageStartX),
        y: position.y,
      })
    }

    // For LTR, simply subtract the page start position from the absolute position
    return new UnsafeSpineItemPagePosition({
      x: position.x - pageStartX,
      y: position.y,
    })
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
    getSpineItemPageIndexFromPosition: (params: {
      position: SpineItemPosition
      isUsingVerticalWriting: boolean
      itemWidth: number
      itemHeight: number
    }) =>
      getSpineItemPageIndexFromSpineItemPosition({
        ...params,
        isRTL: context.isRTL(),
        pageWidth: context.getPageSize().width,
        pageHeight: context.getPageSize().height,
        pageTurnDirection: settings.values.computedPageTurnDirection,
        pageTurnMode: settings.values.pageTurnMode,
      }),
    getSpineItemPageIndexFromNode,
    getSpineItemClosestPositionFromUnsafePosition,
    getSpineItemPagePositionFromSpineItemPosition,
  }
}
