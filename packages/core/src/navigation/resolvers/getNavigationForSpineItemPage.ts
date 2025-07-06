import type { SpineLocator } from "../../spine/locator/SpineLocator"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import type { SpineItemNavigationResolver } from "../../spineItem/navigationResolver"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { Viewport } from "../../viewport/Viewport"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { getNavigationForPosition } from "./getNavigationForPosition"

export const getNavigationForSpineItemPage = ({
  pageIndex,
  spineItemsManager,
  spineItemId,
  spineLocator,
  spineItemNavigationResolver,
  viewport,
}: {
  pageIndex: number
  spineItemId: SpineItem | number | string
  spineItemsManager: SpineItemsManager
  spineItemNavigationResolver: SpineItemNavigationResolver
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
      spineItemNavigationResolver,
      spineLocator,
      viewport,
    })
  }

  const spineItemNavigation =
    spineLocator.spineItemLocator.getSpineItemPositionFromPageIndex({
      pageIndex,
      spineItem,
    })

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
