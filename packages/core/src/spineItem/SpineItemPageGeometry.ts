import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Viewport } from "../viewport/Viewport"
import { SpineItemPosition, UnboundSpineItemPagePosition } from "./types"

type Size = { width: number; height: number }

export type SpineItemPageGeometryParams = {
  itemSize: Size
  /** The size of a page of the viewport: half its width in a spread. */
  viewportPageSize: Size
  /**
   * Called only by the methods that need it, at most once: reading the
   * writing mode of a loaded document reads its computed style.
   */
  isUsingVerticalWriting: () => boolean
  isRTL: boolean
  pageTurnDirection: "horizontal" | "vertical"
  pageTurnMode: "controlled" | "scrollable"
}

export const clampPositionInSpineItem = (
  position: SpineItemPosition,
  itemSize: Size,
) =>
  new SpineItemPosition({
    x: Math.min(Math.max(0, position.x), itemSize.width),
    y: Math.min(Math.max(0, position.y), itemSize.height),
  })

const getNumberOfPagesAlongAxis = (itemLength: number, pageLength: number) => {
  if (!itemLength || !pageLength) return 1

  return Math.floor(Math.max(1, itemLength / pageLength))
}

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

const getPageStartAlongAxis = (
  pageIndex: number,
  pageLength: number,
  itemLength: number,
) => Math.max(0, Math.min(itemLength - pageLength, pageIndex * pageLength))

/**
 * How a spine item divides into pages of `pageSize`, and where a position in
 * the item falls among them.
 *
 * Pages are placed from the top down for vertical writing, and across the
 * item otherwise, from its right edge in a right-to-left book. Positions are
 * in the item's own coordinates, from its top-left corner.
 */
export class SpineItemPageGeometry {
  private isUsingVerticalWritingValue: boolean | undefined

  constructor(private readonly params: SpineItemPageGeometryParams) {}

  private get isUsingVerticalWriting() {
    this.isUsingVerticalWritingValue ??= this.params.isUsingVerticalWriting()

    return this.isUsingVerticalWritingValue
  }

  /**
   * At least one. It counts a blank page laid out before or after the item
   * in a spread.
   *
   * It is one when the `pageTurnMode` setting is `scrollable` with a
   * vertical page turn. Otherwise the pages are counted down the item's
   * height for vertical writing or a vertical page turn, and across its width
   * for the rest. So with a vertical page turn and horizontal writing, the
   * count reads the height while the methods below place the pages across the
   * width.
   */
  get numberOfPages() {
    const { itemSize, viewportPageSize, pageTurnDirection, pageTurnMode } =
      this.params

    if (pageTurnDirection === "vertical" && pageTurnMode === "scrollable") {
      return 1
    }

    if (this.isUsingVerticalWriting || pageTurnDirection === "vertical") {
      return getNumberOfPagesAlongAxis(itemSize.height, viewportPageSize.height)
    }

    return getNumberOfPagesAlongAxis(itemSize.width, viewportPageSize.width)
  }

  /**
   * The size of each page of the item. A page of vertical writing is as wide
   * as the item: in a spread, its lines fill both halves.
   */
  get pageSize(): Size {
    const { itemSize, viewportPageSize } = this.params

    return this.isUsingVerticalWriting
      ? { width: itemSize.width, height: viewportPageSize.height }
      : viewportPageSize
  }

  /**
   * The index of the page holding a position. A position outside the item is
   * on its nearest page.
   */
  getPageIndexFromPosition(position: SpineItemPosition) {
    const { itemSize, viewportPageSize, isRTL } = this.params
    const positionInItem = clampPositionInSpineItem(position, itemSize)
    const { numberOfPages } = this

    if (this.isUsingVerticalWriting) {
      return getPageIndexAlongAxis(
        positionInItem.y,
        viewportPageSize.height,
        numberOfPages,
      )
    }

    const pageIndexFromLeft = getPageIndexAlongAxis(
      positionInItem.x,
      viewportPageSize.width,
      numberOfPages,
    )

    return isRTL ? numberOfPages - 1 - pageIndexFromLeft : pageIndexFromLeft
  }

  /**
   * Where a page starts in the item: its top-left corner. A page index after
   * the last page gives the last page.
   */
  getPositionFromPageIndex(pageIndex: number) {
    const { itemSize, viewportPageSize, isRTL } = this.params

    if (this.isUsingVerticalWriting) {
      return new SpineItemPosition({
        x: 0,
        y: getPageStartAlongAxis(
          pageIndex,
          viewportPageSize.height,
          itemSize.height,
        ),
      })
    }

    const pageStartFromLeft = getPageStartAlongAxis(
      pageIndex,
      viewportPageSize.width,
      itemSize.width,
    )

    /**
     * In a right-to-left book, the reader places an item at the right edge of
     * its page. The page of an item narrower than a page then starts before
     * the item's left edge, at a negative x.
     */
    return new SpineItemPosition({
      x: isRTL
        ? itemSize.width - pageStartFromLeft - viewportPageSize.width
        : pageStartFromLeft,
      y: 0,
    })
  }

  /** A position relative to the top-left corner of a page. */
  getPositionInPage(position: SpineItemPosition, pageIndex: number) {
    const pageStart = this.getPositionFromPageIndex(pageIndex)

    return new UnboundSpineItemPagePosition({
      x: position.x - pageStart.x,
      y: position.y - pageStart.y,
    })
  }

  /**
   * Each axis of a position moved back to a multiple of the page size, and
   * held within the item: a grid of pages laid from the item's top-left
   * corner, whatever the writing mode and the page count. A navigation to the
   * position shows the item from there.
   */
  snapPositionToPageGrid(position: SpineItemPosition) {
    const { itemSize, viewportPageSize } = this.params

    return new SpineItemPosition({
      x:
        viewportPageSize.width *
        getPageIndexAlongAxis(
          position.x,
          viewportPageSize.width,
          getNumberOfPagesAlongAxis(itemSize.width, viewportPageSize.width),
        ),
      y:
        viewportPageSize.height *
        getPageIndexAlongAxis(
          position.y,
          viewportPageSize.height,
          getNumberOfPagesAlongAxis(itemSize.height, viewportPageSize.height),
        ),
    })
  }
}

export const createSpineItemPageGeometry = ({
  itemSize,
  isUsingVerticalWriting,
  context,
  settings,
  viewport,
}: {
  itemSize: Size
  isUsingVerticalWriting: () => boolean
  context: Context
  settings: ReaderSettingsManager
  viewport: Viewport
}) =>
  new SpineItemPageGeometry({
    itemSize,
    viewportPageSize: viewport.pageSize,
    isUsingVerticalWriting,
    isRTL: context.isRTL(),
    pageTurnDirection: settings.values.computedPageTurnDirection,
    pageTurnMode: settings.values.pageTurnMode,
  })
