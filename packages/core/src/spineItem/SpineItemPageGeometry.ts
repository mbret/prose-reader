import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Viewport } from "../viewport/Viewport"
import { SpineItemPosition, UnboundSpineItemPagePosition } from "./types"

type Size = { width: number; height: number }

export type SpineItemPageGeometryParams = {
  itemSize: Size
  pageSize: Size
  isUsingVerticalWriting: boolean
  isRTL: boolean
  pageTurnDirection: "horizontal" | "vertical"
  pageTurnMode: "controlled" | "scrollable"
}

/**
 * A position held within an item: from 0 to its width and its height.
 */
export const clampPositionInSpineItem = (
  position: SpineItemPosition,
  itemSize: Size,
) =>
  new SpineItemPosition({
    x: Math.min(Math.max(0, position.x), itemSize.width),
    y: Math.min(Math.max(0, position.y), itemSize.height),
  })

/**
 * How many pages of `pageLength` fit in `itemLength`: only whole pages, and
 * at least one, as an item with no size yet has.
 */
const getNumberOfPagesAlongAxis = (itemLength: number, pageLength: number) => {
  if (!itemLength || !pageLength) return 1

  return Math.floor(Math.max(1, itemLength / pageLength))
}

/**
 * The index of the page holding an offset along one axis, counted from the
 * axis origin: the first page before it, the last page after it.
 */
const getPageIndexAlongAxis = (
  offset: number,
  pageLength: number,
  numberOfPages: number,
) => {
  if (offset <= 0) return 0

  for (let pageIndex = 0; pageIndex < numberOfPages - 1; pageIndex += 1) {
    if (offset < pageIndex * pageLength + pageLength) return pageIndex
  }

  return numberOfPages - 1
}

/**
 * Where a page starts along one axis, counted from the axis origin. A page
 * after the last one starts where the last one does.
 */
const getPageStartAlongAxis = (
  pageIndex: number,
  pageLength: number,
  itemLength: number,
) => Math.max(0, Math.min(itemLength - pageLength, pageIndex * pageLength))

/**
 * How a spine item divides into pages of the viewport's page size, and where
 * a position in the item falls among them.
 *
 * Pages are placed from the top down for vertical writing, and across the
 * item otherwise, from its right edge in a right-to-left book. Positions are
 * in the item's own coordinates, from its top-left corner.
 */
export class SpineItemPageGeometry {
  /**
   * At least one. An item has one page when the book scrolls vertically. The
   * pages are counted down the item's height for vertical writing or a
   * vertical page turn, and across its width otherwise. So with a vertical
   * page turn and horizontal writing, the count reads the height while the
   * methods below place the pages across the width.
   */
  public readonly numberOfPages: number

  constructor(private readonly params: SpineItemPageGeometryParams) {
    const {
      itemSize,
      pageSize,
      isUsingVerticalWriting,
      pageTurnDirection,
      pageTurnMode,
    } = params

    if (pageTurnDirection === "vertical" && pageTurnMode === "scrollable") {
      this.numberOfPages = 1
    } else if (isUsingVerticalWriting || pageTurnDirection === "vertical") {
      this.numberOfPages = getNumberOfPagesAlongAxis(
        itemSize.height,
        pageSize.height,
      )
    } else {
      this.numberOfPages = getNumberOfPagesAlongAxis(
        itemSize.width,
        pageSize.width,
      )
    }
  }

  /**
   * The index of the page holding a position. A position outside the item is
   * on its nearest page.
   */
  getPageIndexFromPosition(position: SpineItemPosition) {
    const { itemSize, pageSize, isUsingVerticalWriting, isRTL } = this.params
    const positionInItem = clampPositionInSpineItem(position, itemSize)

    if (isUsingVerticalWriting) {
      return getPageIndexAlongAxis(
        positionInItem.y,
        pageSize.height,
        this.numberOfPages,
      )
    }

    const pageIndexFromLeft = getPageIndexAlongAxis(
      positionInItem.x,
      pageSize.width,
      this.numberOfPages,
    )

    return isRTL
      ? this.numberOfPages - 1 - pageIndexFromLeft
      : pageIndexFromLeft
  }

  /**
   * Where a page starts in the item: its top-left corner. A page index after
   * the last page gives the last page.
   */
  getPositionFromPageIndex(pageIndex: number) {
    const { itemSize, pageSize, isUsingVerticalWriting, isRTL } = this.params

    if (isUsingVerticalWriting) {
      return new SpineItemPosition({
        x: 0,
        y: getPageStartAlongAxis(pageIndex, pageSize.height, itemSize.height),
      })
    }

    const pageStartFromLeft = getPageStartAlongAxis(
      pageIndex,
      pageSize.width,
      itemSize.width,
    )

    return new SpineItemPosition({
      x: isRTL
        ? Math.max(0, itemSize.width - pageStartFromLeft - pageSize.width)
        : pageStartFromLeft,
      y: 0,
    })
  }

  /**
   * A position relative to the top-left corner of a page. It is outside the
   * page when the position is.
   */
  getPositionInPage(position: SpineItemPosition, pageIndex: number) {
    const pageStart = this.getPositionFromPageIndex(pageIndex)

    return new UnboundSpineItemPagePosition({
      x: position.x - pageStart.x,
      y: position.y - pageStart.y,
    })
  }

  /**
   * The start of the page a position falls on: each axis snapped to a grid
   * of pages laid from the item's top-left corner, and held within the item.
   * This is where a navigation to that position shows the item from.
   */
  getClosestPageStart(position: SpineItemPosition) {
    const { itemSize, pageSize } = this.params

    return new SpineItemPosition({
      x:
        pageSize.width *
        getPageIndexAlongAxis(
          position.x,
          pageSize.width,
          getNumberOfPagesAlongAxis(itemSize.width, pageSize.width),
        ),
      y:
        pageSize.height *
        getPageIndexAlongAxis(
          position.y,
          pageSize.height,
          getNumberOfPagesAlongAxis(itemSize.height, pageSize.height),
        ),
    })
  }
}

/**
 * The page geometry of an item of `itemSize`, at the viewport's current page
 * size, with the book's current direction and page turn settings.
 */
export const createSpineItemPageGeometry = ({
  itemSize,
  isUsingVerticalWriting,
  context,
  settings,
  viewport,
}: {
  itemSize: Size
  isUsingVerticalWriting: boolean
  context: Context
  settings: ReaderSettingsManager
  viewport: Viewport
}) =>
  new SpineItemPageGeometry({
    itemSize,
    pageSize: viewport.pageSize,
    isUsingVerticalWriting,
    isRTL: context.isRTL(),
    pageTurnDirection: settings.values.computedPageTurnDirection,
    pageTurnMode: settings.values.pageTurnMode,
  })
