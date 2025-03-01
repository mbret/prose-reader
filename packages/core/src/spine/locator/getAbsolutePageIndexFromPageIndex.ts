import type { Context } from "../../context/Context"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemsManager } from "../SpineItemsManager"
import type { SpineLayout } from "../SpineLayout"

export const getAbsolutePageIndexFromPageIndex = ({
  pageIndex,
  spineItemOrId,
  spineItemsManager,
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

      const numberOfPages = item.numberOfPages

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
