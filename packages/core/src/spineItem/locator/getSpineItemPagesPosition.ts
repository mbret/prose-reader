import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { getSpineItemNumberOfPages } from "./getSpineItemNumberOfPages"
import { getSpineItemPositionFromPageIndex } from "./getSpineItemPositionFromPageIndex"

export const getSpineItemPagesPosition = ({
  context,
  isUsingVerticalWriting,
  settings,
  itemLayout,
}: {
  itemLayout: { width: number; height: number }
  isUsingVerticalWriting: boolean
  settings: ReaderSettingsManager
  context: Context
}) => {
  const numberOfPages = getSpineItemNumberOfPages({
    context,
    isUsingVerticalWriting,
    itemHeight: itemLayout.height,
    itemWidth: itemLayout.width,
    settings,
  })

  return new Array(numberOfPages).fill(undefined).map((_, pageIndex) =>
    getSpineItemPositionFromPageIndex({
      context,
      isUsingVerticalWriting,
      itemLayout,
      pageIndex,
    }),
  )
}
