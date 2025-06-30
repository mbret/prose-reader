import type { SpineItemPosition } from "../types"
import { getPageFromOffset } from "./getPageFromOffset"
import { getSafePosition } from "./getSafePosition"
import { getSpineItemNumberOfPages } from "./getSpineItemNumberOfPages"

/**
 * @important
 * This calculation takes blank page into account, the iframe could be only one page but with a blank page
 * positioned before. Resulting on two page index possible values (0 & 1).
 */
export const getSpineItemPageIndexFromSpineItemPosition = ({
  itemWidth,
  itemHeight,
  position,
  isUsingVerticalWriting,
  pageWidth,
  pageHeight,
  pageTurnDirection,
  pageTurnMode,
  isRTL,
}: {
  itemWidth: number
  itemHeight: number
  position: SpineItemPosition
  isUsingVerticalWriting: boolean
  pageWidth: number
  pageHeight: number
  pageTurnDirection: "vertical" | "horizontal"
  pageTurnMode: "scrollable" | "controlled"
  isRTL: boolean
}) => {
  const safePosition = getSafePosition({
    spineItemPosition: position,
    itemHeight,
    itemWidth,
  })

  const offset = safePosition.x

  const numberOfPages = getSpineItemNumberOfPages({
    isUsingVerticalWriting,
    itemHeight,
    itemWidth,
    pageWidth,
    pageHeight,
    pageTurnDirection,
    pageTurnMode,
  })

  if (isUsingVerticalWriting) {
    return getPageFromOffset(position.y, pageHeight, numberOfPages)
  }

  const pageIndex = getPageFromOffset(offset, pageWidth, numberOfPages)

  console.log({
    pageIndex,
    position,
    safePosition,
    numberOfPages,
    offset,
    pageWidth,
    pageHeight,
  })

  if (isRTL) {
    // Reverse the page index for RTL
    return numberOfPages - 1 - pageIndex
  }

  return pageIndex
}
