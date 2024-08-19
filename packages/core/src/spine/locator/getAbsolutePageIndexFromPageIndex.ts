import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItem } from "../../spineItem/createSpineItem"
import { getSpineItemNumberOfPages } from "../../spineItem/locator/getSpineItemNumberOfPages"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineLayout } from "../SpineLayout"

export const getAbsolutePageIndexFromPageIndex = ({
  pageIndex,
  spineItemOrId,
  spineLayout,
  spineItemsManager,
  context,
  settings,
}: {
  pageIndex: number
  spineItemOrId: number | SpineItem | string
  spineLayout: SpineLayout
  spineItemsManager: SpineItemsManager
  context: Context
  settings: ReaderSettingsManager
}) => {
  const items = spineItemsManager.items
  const spineItem = spineItemsManager.get(spineItemOrId)

  if (!spineItem) return undefined

  const { currentAbsolutePage } = items.reduce(
    (acc, item) => {
      if (acc.found) return acc

      const itemLayout = spineLayout.getAbsolutePositionOf(item)

      const numberOfPages = getSpineItemNumberOfPages({
        isUsingVerticalWriting: !!item.isUsingVerticalWriting(),
        itemHeight: itemLayout.height,
        itemWidth: itemLayout.width,
        context,
        settings,
      })

      if (spineItem === item) {
        if (pageIndex <= numberOfPages - 1) {
          return {
            currentAbsolutePage: acc.currentAbsolutePage + pageIndex,
            found: true,
          }
        }
      }

      return {
        ...acc,
        currentAbsolutePage: acc.currentAbsolutePage + numberOfPages,
      }
    },
    { currentAbsolutePage: 0, found: false },
  )

  return currentAbsolutePage
}