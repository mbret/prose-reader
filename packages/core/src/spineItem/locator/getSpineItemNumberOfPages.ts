import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { calculateNumberOfPagesForItem } from "../helpers"

export const getSpineItemNumberOfPages = ({
  itemHeight,
  itemWidth,
  isUsingVerticalWriting,
  settings,
  context,
}: {
  itemWidth: number
  itemHeight: number
  isUsingVerticalWriting: boolean
  settings: ReaderSettingsManager
  context: Context
}) => {
  // pre-paginated always are only one page
  // if (!spineItem.isReflowable) return 1

  const { pageTurnDirection, pageTurnMode } = settings.values

  if (pageTurnDirection === `vertical` && pageTurnMode === `scrollable`) {
    return 1
  }

  if (isUsingVerticalWriting || pageTurnDirection === `vertical`) {
    return calculateNumberOfPagesForItem(
      itemHeight,
      context.getPageSize().height,
    )
  }

  return calculateNumberOfPagesForItem(itemWidth, context.getPageSize().width)
}
