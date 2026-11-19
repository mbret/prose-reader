import type { SpineLocator } from "../../spine/locator/SpineLocator.ts"
import type { SpineItemsManager } from "../../spine/SpineItemsManager.ts"
import { SpinePosition } from "../../spine/types.ts"
import type { SpineItem } from "../../spineItem/SpineItem.ts"
import type { Viewport } from "../../viewport/Viewport.ts"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread.ts"
import { getNavigationForPosition } from "./getNavigationForPosition.ts"

export const getNavigationForSpineItemPage = ({
  pageIndex,
  spineItemsManager,
  spineItemId,
  spineLocator,
  viewport,
}: {
  pageIndex: number
  spineItemId: SpineItem | number | string
  spineItemsManager: SpineItemsManager
  spineLocator: SpineLocator
  viewport: Viewport
}): SpinePosition => {
  const spineItem = spineItemsManager.get(spineItemId)

  // lookup for entire book
  // This is reliable for pre-paginated, do not use it for reflowable book
  if (!spineItem) {
    const xPositionForPageIndex = pageIndex * viewport.pageSize.width
    return getNavigationForPosition({
      viewportPosition: new SpinePosition({ x: xPositionForPageIndex, y: 0 }),
      spineLocator,
      viewport,
    })
  }

  const spineItemNavigation =
    spineItem.pageGeometry.getPositionFromPageIndex(pageIndex)

  const readingOffset = spineLocator.getSpinePositionFromSpineItemPosition({
    spineItemPosition: spineItemNavigation,
    spineItem,
  })

  return getAdjustedPositionForSpread({
    position: readingOffset,
    pageSizeWidth: viewport.pageSize.width,
    visibleAreaRectWidth: viewport.absoluteViewport.width,
  })
}
