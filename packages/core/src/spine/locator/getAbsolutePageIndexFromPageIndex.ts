import type { Context } from "../../context/Context.ts"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager.ts"
import type { SpineItem } from "../../spineItem/SpineItem.ts"
import type { SpineItemsManager } from "../SpineItemsManager.ts"
import type { SpineLayout } from "../SpineLayout.ts"

/**
 * @deprecated use Pages
 */
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

      const { numberOfPages } = item.pageGeometry

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
