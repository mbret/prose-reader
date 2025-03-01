import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
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
