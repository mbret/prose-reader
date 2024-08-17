import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpineItem } from "../../spineItem/createSpineItem"
import { getSpineItemNumberOfPages } from "../../spineItem/locator/getSpineItemNumberOfPages"
import { SpineItemsManager } from "../SpineItemsManager"
import { SpineLayout } from "../SpineLayout"

export const getSpineInfoFromAbsolutePageIndex = ({
  absolutePageIndex,
  spineLayout,
  spineItemsManager,
  context,
  settings,
}: {
  absolutePageIndex: number
  spineLayout: SpineLayout
  spineItemsManager: SpineItemsManager
  context: Context
  settings: ReaderSettingsManager
}) => {
  const items = spineItemsManager.items

  const { found, currentAbsolutePage } = items.reduce(
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

      const possiblePageIndex = absolutePageIndex - acc.currentAbsolutePage

      const currentAbsolutePage = acc.currentAbsolutePage + numberOfPages

      if (possiblePageIndex <= numberOfPages - 1) {
        return {
          ...acc,
          currentAbsolutePage,
          found: { item, pageIndex: possiblePageIndex },
        }
      }

      return {
        ...acc,
        currentAbsolutePage,
      }
    },
    { currentAbsolutePage: 0 } as {
      found?: { item: SpineItem; pageIndex: number }
      currentAbsolutePage: number
    },
  )

  if (found) {
    return {
      spineItem: found.item,
      pageIndex: found.pageIndex,
      itemIndex: spineItemsManager.getSpineItemIndex(found.item) ?? 0,
      currentAbsolutePage,
    }
  }

  return undefined
}
