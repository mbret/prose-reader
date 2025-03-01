import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"

export const getSpineInfoFromAbsolutePageIndex = ({
  absolutePageIndex,
  spineItemsManager,
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

      const numberOfPages = item.numberOfPages

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
