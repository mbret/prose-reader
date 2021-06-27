import { Report } from "../report"
import { Context } from "../context"
import { ReadingItemManager } from "../readingItemManager"
import { ReadingItem } from "../readingItem"
import { createNavigator as createReadingItemNavigator } from "../readingItem/navigator"
import { createLocator } from "./locator"
import { createCfiHelper } from "./cfiHelper"

type NavigationEntry = { x: number, y: number, readingItem?: ReadingItem }
type ViewportPosition = { x: number, y: number }
type ReadingItemPosition = { x: number, y: number }

const NAMESPACE = `readingOrderViewNavigator`

export const createNavigator = ({ context, readingItemManager }: {
  context: Context,
  readingItemManager: ReadingItemManager
}) => {
  const readingItemNavigator = createReadingItemNavigator({ context })
  const cfiHelper = createCfiHelper({ readingItemManager, context })
  const locator = createLocator({ context, readingItemManager })

  const arePositionsDifferent = (a: { x: number, y: number }, b: { x: number, y: number }) => a.x !== b.x || a.y !== b.y

  const wrapPositionWithSafeEdge = (position: ReadingItemPosition) => {
    // @todo use container width instead to increase performances
    const lastReadingItem = readingItemManager.get(readingItemManager.getLength() - 1)
    const distanceOfLastReadingItem = readingItemManager.getAbsolutePositionOf(lastReadingItem || 0)
    const maximumOffset = distanceOfLastReadingItem.end - context.getPageSize().width

    return {
      x: Math.min(Math.max(0, position.x), maximumOffset),
      y: Math.max(0, position.y)
    }
  }

  const getAdjustedPositionForSpread = ({ x, y }: { x: number, y: number }) => {
    const isOffsetNotAtEdge = (x % context.getVisibleAreaRect().width) !== 0
    const correctedX = isOffsetNotAtEdge ? x - context.getPageSize().width : x

    return { x: correctedX, y }
  }

  const getNavigationForCfi = (cfi: string): NavigationEntry => {
    const readingItem = cfiHelper.getReadingItemFromCfi(cfi)
    if (!readingItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)
    } else {
      const readingItemNavigation = readingItemNavigator.getNavigationForCfi(cfi, readingItem)
      const readingPosition = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

      // very important to always return a reading item since we want to focus on that particular one
      return { ...getAdjustedPositionForSpread(readingPosition), readingItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForPage = (pageIndex: number, readingItem: ReadingItem): NavigationEntry => {
    const readingItemNavigation = readingItemNavigator.getNavigationForPage(pageIndex, readingItem)
    const readingOffset = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

    return getAdjustedPositionForSpread(readingOffset)
  }

  const getNavigationForLastPage = (readingItem: ReadingItem): NavigationEntry => {
    const readingItemNavigation = readingItemNavigator.getNavigationForLastPage(readingItem)
    const position = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForSpineIndexOrId = (indexOrId: number | string): NavigationEntry => {
    const readingItem = readingItemManager.get(indexOrId)
    if (readingItem) {
      const position = locator.getReadingOrderViewPositionFromReadingItem(readingItem)

      return { ...getAdjustedPositionForSpread(position), readingItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForRightSinglePage = (position: ReadingItemPosition): NavigationEntry => {
    const readingItem = locator.getReadingItemFromPosition(position) || readingItemManager.getFocusedReadingItem()
    const defaultNavigation = position

    if (!readingItem) {
      return defaultNavigation
    }

    // translate viewport position into reading item local position
    const readingItemPosition = locator.getReadingItemRelativePositionFromReadingOrderViewPosition(position, readingItem)
    // get reading item local position for right page
    const readingItemNavigationForRightPage = readingItemNavigator.getNavigationForRightPage(readingItemPosition, readingItem)
    // check both position to see if we moved out of it
    const isNewNavigationInCurrentItem = !readingItemPosition.outsideOfBoundaries && arePositionsDifferent(readingItemNavigationForRightPage, readingItemPosition)

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        context.isRTL()
          ? { x: position.x - context.getPageSize().width, y: 0 }
          : { x: position.x + context.getPageSize().width, y: 0 }
      )
    } else {
      const readingOrderPosition = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigationForRightPage, readingItem)

      return readingOrderPosition
    }
  }

  const getNavigationForLeftSinglePage = (position: ReadingItemPosition): NavigationEntry => {
    const readingItem = locator.getReadingItemFromPosition(position) || readingItemManager.getFocusedReadingItem()
    const defaultNavigation = { ...position, readingItem }

    if (!readingItem) {
      return defaultNavigation
    }

    const readingItemPosition = locator.getReadingItemRelativePositionFromReadingOrderViewPosition(position, readingItem)
    readingItemNavigator.getNavigationForCfi
    const readingItemNavigation = readingItemNavigator.getNavigationForLeftPage(readingItemPosition, readingItem)
    const isNewNavigationInCurrentItem = !readingItemPosition.outsideOfBoundaries && arePositionsDifferent(readingItemNavigation, readingItemPosition)

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        context.isRTL()
          ? { x: position.x + context.getPageSize().width, y: 0 }
          : { x: position.x - context.getPageSize().width, y: 0 }
      )
    } else {
      const readingOrderPosition = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

      return readingOrderPosition
    }
  }

  /**
   * Very naive approach for spread. It could be optimized but by using this approach
   * we do not add complexity to the code and use the current logic to handle it correctly.
   * 
   * @important
   * Special case for vertical content, read content
   */
  const getNavigationForRightPage = (position: ReadingItemPosition): NavigationEntry => {
    const readingItemOnPosition = locator.getReadingItemFromPosition(position) || readingItemManager.getFocusedReadingItem()

    let navigation = getNavigationForRightSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (readingItemOnPosition?.isUsingVerticalWriting() && position.x === navigation.x) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.shouldDisplaySpread()) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (readingItemOnPosition?.isUsingVerticalWriting() && position.x !== navigation.x) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? { ...navigation, x: navigation.x - context.getPageSize().width }
              : { ...navigation, x: navigation.x + context.getPageSize().width }
          )
        )
      }

      navigation = getNavigationForRightSinglePage(navigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  /**
   * Very naive approach for spread. It could be optimized but by using this approach
   * we do not add complexity to the code and use the current logic to handle it correctly.
   * 
   * @important
   * Special case for vertical content, read content
   */
  const getNavigationForLeftPage = (position: ReadingItemPosition): NavigationEntry => {
    const readingItemOnPosition = locator.getReadingItemFromPosition(position) || readingItemManager.getFocusedReadingItem()

    let navigation = getNavigationForLeftSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (readingItemOnPosition?.isUsingVerticalWriting() && position.x === navigation.x) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.shouldDisplaySpread()) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (readingItemOnPosition?.isUsingVerticalWriting() && position.x !== navigation.x) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? { ...navigation, x: navigation.x + context.getPageSize().width }
              : { ...navigation, x: navigation.x - context.getPageSize().width }
          )
        )
      }

      navigation = getNavigationForLeftSinglePage(navigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  const getNavigationForUrl = (url: string | URL): NavigationEntry & { url: URL } | undefined => {
    let validUrl: URL | undefined
    try {
      validUrl = url instanceof URL ? url : new URL(url)
    } catch (e) {
      Report.error(e)
    }
    if (validUrl) {
      const urlWithoutAnchor = `${validUrl.origin}${validUrl.pathname}`
      const existingSpineItem = context.getManifest()?.readingOrder.find(item => item.href === urlWithoutAnchor)
      if (existingSpineItem) {
        const readingItem = readingItemManager.get(existingSpineItem.id)
        if (readingItem) {
          const position = getNavigationForAnchor(validUrl.hash, readingItem)

          return { ...getAdjustedPositionForSpread(position), url: validUrl }
        }
      }
    }

    return undefined
  }

  const getNavigationForAnchor = (anchor: string, readingItem: ReadingItem) => {
    const position = locator.getReadingOrderViewPositionFromReadingItemAnchor(anchor, readingItem)

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForPosition = (viewportPosition: ViewportPosition) => {
    const readingItem = locator.getReadingItemFromPosition(viewportPosition)

    if (readingItem) {
      const readingItemPosition = locator.getReadingItemRelativePositionFromReadingOrderViewPosition(viewportPosition, readingItem)
      const readingItemValidPosition = readingItemNavigator.getNavigationForPosition(readingItem, readingItemPosition)
      const viewportNavigation = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemValidPosition, readingItem)

      return getAdjustedPositionForSpread(viewportNavigation)
    }

    return { x: 0, y: 0 }
  }

  return {
    getNavigationForCfi,
    getNavigationForPage,
    getNavigationForLastPage,
    getNavigationForSpineIndexOrId,
    getNavigationForRightPage,
    getNavigationForLeftPage,
    getNavigationForUrl,
    getNavigationForAnchor,
    getNavigationForPosition,
    wrapPositionWithSafeEdge,
  }
}