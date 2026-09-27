import { calculateNumberOfPagesForItem } from "../helpers"

export const getSpineItemNumberOfPages = ({
  itemHeight,
  itemWidth,
  isUsingVerticalWriting,
  pageWidth,
  pageHeight,
  pageTurnDirection,
  pageTurnMode,
}: {
  itemWidth: number
  itemHeight: number
  isUsingVerticalWriting: boolean
  pageWidth: number
  pageHeight: number
  pageTurnDirection: "vertical" | "horizontal"
  pageTurnMode: "scrollable" | "controlled"
}) => {
  /**
   * Written vertically, a document is paginated whatever the mode, its pages
   * running downward.
   */
  if (isUsingVerticalWriting) {
    return calculateNumberOfPagesForItem(itemHeight, pageHeight)
  }

  if (pageTurnDirection === `vertical` && pageTurnMode === `scrollable`) {
    return 1
  }

  if (pageTurnDirection === `vertical`) {
    return calculateNumberOfPagesForItem(itemHeight, pageHeight)
  }

  return calculateNumberOfPagesForItem(itemWidth, pageWidth)
}
