import { Report } from "../report"
import { Context } from "../context"
import { SpineItemManager } from "../spineItemManager"
import { ReadingItem } from "../readingItem"
import { createNavigationResolver as createReadingItemNavigator } from "../readingItem/navigationResolver"
import { createLocationResolver } from "./locationResolver"
import { createCfiLocator } from "./cfiLocator"

export type ViewportNavigationEntry = { x: number, y: number, readingItem?: ReadingItem }
type ViewportPosition = { x: number, y: number }
type ReadingItemPosition = { x: number, y: number }

const NAMESPACE = `readingOrderViewNavigator`

export const createNavigationResolver = ({ context, spineItemManager, cfiLocator, locator }: {
  context: Context,
  spineItemManager: SpineItemManager,
  cfiLocator: ReturnType<typeof createCfiLocator>,
  locator: ReturnType<typeof createLocationResolver>
}) => {
  const readingItemNavigator = createReadingItemNavigator({ context })

  const arePositionsDifferent = (a: ViewportNavigationEntry, b: ViewportNavigationEntry) => a.x !== b.x || a.y !== b.y

  const areNavigationDifferent = (a: ViewportNavigationEntry, b: ViewportNavigationEntry) => arePositionsDifferent(a, b) || ((!!a.readingItem && !!b.readingItem) && (a.readingItem !== b.readingItem))

  const wrapPositionWithSafeEdge = Report.measurePerformance(`${NAMESPACE} wrapPositionWithSafeEdge`, 1, (position: ReadingItemPosition) => {
    // @todo use container width instead to increase performances
    const lastReadingItem = spineItemManager.get(spineItemManager.getLength() - 1)
    const distanceOfLastReadingItem = spineItemManager.getAbsolutePositionOf(lastReadingItem || 0)
    const maximumXOffset = distanceOfLastReadingItem.leftEnd - context.getPageSize().width
    const maximumYOffset = distanceOfLastReadingItem.topEnd - context.getPageSize().height

    return {
      x: Math.min(Math.max(0, position.x), maximumXOffset),
      y: Math.min(Math.max(0, position.y), maximumYOffset)
    }
  }, { disable: true })

  const getAdjustedPositionForSpread = ({ x, y }: ViewportNavigationEntry): ViewportNavigationEntry => {
    const isOffsetNotAtEdge = (x % context.getVisibleAreaRect().width) !== 0
    const correctedX = isOffsetNotAtEdge ? x - context.getPageSize().width : x

    return { x: correctedX, y }
  }

  const getNavigationForCfi = (cfi: string): ViewportNavigationEntry => {
    const readingItem = cfiLocator.getReadingItemFromCfi(cfi)
    const { node, offset = 0 } = cfiLocator.resolveCfi(cfi) || {}

    if (!readingItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)
    } else {
      const readingItemNavigation = node ? readingItemNavigator.getNavigationFromNode(readingItem, node, offset) : { x: 0, y: 0 }
      const readingPosition = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

      // very important to always return a reading item since we want to focus on that particular one
      return { ...getAdjustedPositionForSpread(readingPosition), readingItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForPage = (pageIndex: number, readingItem?: ReadingItem): ViewportNavigationEntry => {
    // lookup for entire book
    // This is reliable for pre-paginated, do not use it for reflowable book
    if (!readingItem) {
      const xPositionForPageIndex = pageIndex * context.getPageSize().width
      return getNavigationForPosition({ x: xPositionForPageIndex, y: 0 })
    }

    const readingItemNavigation = readingItemNavigator.getNavigationForPage(pageIndex, readingItem)
    const readingOffset = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

    return getAdjustedPositionForSpread(readingOffset)
  }

  const getNavigationForLastPage = (readingItem: ReadingItem): ViewportNavigationEntry => {
    const readingItemNavigation = readingItemNavigator.getNavigationForLastPage(readingItem)
    const position = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigation, readingItem)

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForSpineIndexOrId = (indexOrId: number | string): ViewportNavigationEntry => {
    const readingItem = spineItemManager.get(indexOrId)
    if (readingItem) {
      const position = locator.getReadingOrderViewPositionFromReadingItem(readingItem)

      return { ...getAdjustedPositionForSpread(position), readingItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForRightSinglePage = (position: ReadingItemPosition): ViewportNavigationEntry => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection
    const readingItem = locator.getReadingItemFromPosition(position) || spineItemManager.getFocusedReadingItem()
    const defaultNavigation = position

    if (!readingItem) {
      return defaultNavigation
    }

    // translate viewport position into reading item local position
    const readingItemPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(position, readingItem)
    // get reading item local position for right page
    const readingItemNavigationForRightPage = readingItemNavigator.getNavigationForRightPage(readingItemPosition, readingItem)
    // check both position to see if we moved out of it
    const isNewNavigationInCurrentItem = !readingItemPosition.outsideOfBoundaries && arePositionsDifferent(readingItemNavigationForRightPage, readingItemPosition)

    // console.warn({ readingItemPosition, readingItemNavigationForRightPage, isNewNavigationInCurrentItem })
    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        context.isRTL()
          ? pageTurnDirection === `horizontal`
            ? { x: position.x - context.getPageSize().width, y: 0 }
            : { y: position.y + context.getPageSize().height, x: 0 }
          : pageTurnDirection === `horizontal`
            ? { x: position.x + context.getPageSize().width, y: 0 }
            : { y: position.y + context.getPageSize().height, x: 0 }
      )
    } else {
      const readingOrderPosition = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemNavigationForRightPage, readingItem)

      return readingOrderPosition
    }
  }

  const getNavigationForLeftSinglePage = (position: ReadingItemPosition): ViewportNavigationEntry => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection
    const readingItem = locator.getReadingItemFromPosition(position) || spineItemManager.getFocusedReadingItem()
    const defaultNavigation = { ...position, readingItem }

    if (!readingItem) {
      return defaultNavigation
    }

    const readingItemPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(position, readingItem)
    const readingItemNavigation = readingItemNavigator.getNavigationForLeftPage(readingItemPosition, readingItem)
    const isNewNavigationInCurrentItem = !readingItemPosition.outsideOfBoundaries && arePositionsDifferent(readingItemNavigation, readingItemPosition)

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        context.isRTL()
          ? pageTurnDirection === `horizontal`
            ? { x: position.x + context.getPageSize().width, y: 0 }
            : { y: position.y - context.getPageSize().height, x: 0 }
          : pageTurnDirection === `horizontal`
            ? { x: position.x - context.getPageSize().width, y: 0 }
            : { y: position.y - context.getPageSize().height, x: 0 }
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
  const getNavigationForRightPage = (position: ReadingItemPosition): ViewportNavigationEntry => {
    const readingItemOnPosition = locator.getReadingItemFromPosition(position) || spineItemManager.getFocusedReadingItem()

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
              ? {
                  ...navigation,
                  x: navigation.x - context.getPageSize().width
                }
              : {
                  ...navigation,
                  x: navigation.x + context.getPageSize().width
                }
          )
        )
      }

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (context.getSettings().computedPageTurnDirection === `vertical` && position.y !== navigation.y) {
        return getAdjustedPositionForSpread(navigation)
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
  const getNavigationForLeftPage = (position: ReadingItemPosition): ViewportNavigationEntry => {
    const readingItemOnPosition = locator.getReadingItemFromPosition(position) || spineItemManager.getFocusedReadingItem()

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

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (context.getSettings().computedPageTurnDirection === `vertical` && position.y !== navigation.y) {
        return getAdjustedPositionForSpread(navigation)
      }

      navigation = getNavigationForLeftSinglePage(navigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  const getNavigationForUrl = (url: string | URL): ViewportNavigationEntry & { url: URL } | undefined => {
    let validUrl: URL | undefined
    try {
      validUrl = url instanceof URL ? url : new URL(url)
    } catch (e) {
      Report.error(e)
    }
    if (validUrl) {
      const urlWithoutAnchor = `${validUrl.origin}${validUrl.pathname}`
      const existingSpineItem = context.getManifest()?.spineItems.find(item => item.href === urlWithoutAnchor)
      if (existingSpineItem) {
        const readingItem = spineItemManager.get(existingSpineItem.id)
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
      const readingItemPosition = locator.getReadingItemPositionFromReadingOrderViewPosition(viewportPosition, readingItem)
      const readingItemValidPosition = readingItemNavigator.getNavigationForPosition(readingItem, readingItemPosition)
      const viewportNavigation = locator.getReadingOrderViewPositionFromReadingItemPosition(readingItemValidPosition, readingItem)

      return getAdjustedPositionForSpread(viewportNavigation)
    }

    return { x: 0, y: 0 }
  }

  /**
   * Useful when you want to get a navigation from a scroll position. It uses trigger points so it will
   * try to get the most visible / relevant element as navigation reference
   */
  const getMostPredominantNavigationForPosition = (viewportPosition: ViewportPosition) => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection
    // @todo movingForward does not work same with free-scroll, try to find a reliable way to detect
    // const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
    // const triggerPercentage = movingForward ? 0.7 : 0.3
    const triggerPercentage = 0.5
    const triggerXPosition = pageTurnDirection === `horizontal`
      ? viewportPosition.x + (context.getVisibleAreaRect().width * triggerPercentage)
      : 0
    const triggerYPosition = pageTurnDirection === `horizontal`
      ? 0
      : viewportPosition.y + (context.getVisibleAreaRect().height * triggerPercentage)
    const midScreenPositionSafePosition = wrapPositionWithSafeEdge({ x: triggerXPosition, y: triggerYPosition })
    return getNavigationForPosition(midScreenPositionSafePosition)
  }

  const isNavigationGoingForwardFrom = (to: ViewportPosition, from: ViewportPosition) => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection

    if (pageTurnDirection === `vertical`) {
      return to.y > from.y
    }

    return to.x > from.x
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
    getMostPredominantNavigationForPosition,
    wrapPositionWithSafeEdge,
    isNavigationGoingForwardFrom,
    areNavigationDifferent,
    arePositionsDifferent
  }
}
