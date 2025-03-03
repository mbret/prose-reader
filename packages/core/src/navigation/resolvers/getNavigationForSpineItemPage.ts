import type { Context } from "../../context/Context"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { SpinePosition } from "../../spine/types"
import type { SpineItem } from "../../spineItem/SpineItem"
import type { SpineItemNavigationResolver } from "../../spineItem/navigationResolver"
import type { DeprecatedViewportPosition } from "../controllers/ControlledNavigationController"
import { getAdjustedPositionForSpread } from "./getAdjustedPositionForSpread"
import { getNavigationForPosition } from "./getNavigationForPosition"

export const getNavigationForSpineItemPage = ({
  pageIndex,
  spineItemsManager,
  spineItemId,
  context,
  spineLocator,
  spineItemNavigationResolver,
}: {
  pageIndex: number
  spineItemId: SpineItem | number | string
  spineItemsManager: SpineItemsManager
  spineItemNavigationResolver: SpineItemNavigationResolver
  spineLocator: SpineLocator
  context: Context
}): DeprecatedViewportPosition => {
  const spineItem = spineItemsManager.get(spineItemId)

  // lookup for entire book
  // This is reliable for pre-paginated, do not use it for reflowable book
  if (!spineItem) {
    const xPositionForPageIndex = pageIndex * context.getPageSize().width
    return getNavigationForPosition({
      viewportPosition: new SpinePosition({ x: xPositionForPageIndex, y: 0 }),
      context,
      spineItemNavigationResolver,
      spineLocator,
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
    pageSizeWidth: context.getPageSize().width,
    visibleAreaRectWidth: context.state.visibleAreaRect.width,
  })
}
