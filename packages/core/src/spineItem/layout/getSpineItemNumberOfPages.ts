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
  if (pageTurnDirection === `vertical` && pageTurnMode === `scrollable`) {
    return 1
  }

  if (isUsingVerticalWriting || pageTurnDirection === `vertical`) {
    return calculateNumberOfPagesForItem(itemHeight, pageHeight)
  }

  return calculateNumberOfPagesForItem(itemWidth, pageWidth)
}
