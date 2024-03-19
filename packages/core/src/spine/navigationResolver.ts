import { Report } from "../report"
import { Context } from "../context"
import { SpineItemManager } from "../spineItemManager"
import { SpineItem } from "../spineItem/createSpineItem"
import { createNavigationResolver as createSpineItemNavigator } from "../spineItem/navigationResolver"
import { createLocationResolver } from "./locationResolver"
import { createCfiLocator } from "./cfiLocator"
import { SpinePosition, UnsafeSpinePosition } from "./types"
import { SpineItemNavigationPosition } from "../spineItem/types"

export type ViewportNavigationEntry = { x: number; y: number; spineItem?: SpineItem }
type ViewportPosition = { x: number; y: number }

const NAMESPACE = `spineNavigator`

export const createNavigationResolver = ({
  context,
  spineItemManager,
  cfiLocator,
  locator,
}: {
  context: Context
  spineItemManager: SpineItemManager
  cfiLocator: ReturnType<typeof createCfiLocator>
  locator: ReturnType<typeof createLocationResolver>
}) => {
  const spineItemNavigator = createSpineItemNavigator({ context })

  const arePositionsDifferent = (a: ViewportNavigationEntry, b: ViewportNavigationEntry) => a.x !== b.x || a.y !== b.y

  const areNavigationDifferent = (a: ViewportNavigationEntry, b: ViewportNavigationEntry) =>
    arePositionsDifferent(a, b) || (!!a.spineItem && !!b.spineItem && a.spineItem !== b.spineItem)

  const wrapPositionWithSafeEdge = Report.measurePerformance(
    `${NAMESPACE} wrapPositionWithSafeEdge`,
    1,
    (position: SpinePosition) => {
      // @todo use container width instead to increase performances
      const lastSpineItem = spineItemManager.get(spineItemManager.getLength() - 1)
      const distanceOfLastSpineItem = spineItemManager.getAbsolutePositionOf(lastSpineItem || 0)
      const maximumYOffset = distanceOfLastSpineItem.bottom - context.getPageSize().height
      const y = Math.min(Math.max(0, position.y), maximumYOffset)

      /**
       * For RTL books we move from right to left so negative x.
       * [-x, 0]
       */
      if (context.isRTL()) {
        return {
          x: Math.max(Math.min(0, position.x), distanceOfLastSpineItem.left),
          y,
        }
      }

      const maximumXOffset = distanceOfLastSpineItem.right - context.getPageSize().width

      return {
        x: Math.min(Math.max(0, position.x), maximumXOffset),
        y,
      }
    },
    { disable: true },
  )

  const getAdjustedPositionForSpread = ({ x, y }: ViewportNavigationEntry): ViewportNavigationEntry => {
    const isOffsetNotAtEdge = x % context.getVisibleAreaRect().width !== 0
    const correctedX = isOffsetNotAtEdge ? x - context.getPageSize().width : x

    return { x: correctedX, y }
  }

  const getNavigationForCfi = (cfi: string): ViewportNavigationEntry => {
    const spineItem = cfiLocator.getSpineItemFromCfi(cfi)
    const { node, offset = 0 } = cfiLocator.resolveCfi(cfi) || {}

    if (!spineItem) {
      Report.warn(NAMESPACE, `unable to detect item id from cfi ${cfi}`)
    } else {
      const spineItemNavigation = node
        ? spineItemNavigator.getNavigationFromNode(spineItem, node, offset)
        : new SpineItemNavigationPosition({ x: 0, y: 0 })
      const readingPosition = locator.getSpinePositionFromSpineItemPosition(spineItemNavigation, spineItem)

      // very important to always return a reading item since we want to focus on that particular one
      return { ...getAdjustedPositionForSpread(readingPosition), spineItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForPage = (pageIndex: number, spineItem?: SpineItem): ViewportNavigationEntry => {
    // lookup for entire book
    // This is reliable for pre-paginated, do not use it for reflowable book
    if (!spineItem) {
      const xPositionForPageIndex = pageIndex * context.getPageSize().width
      return getNavigationForPosition({ x: xPositionForPageIndex, y: 0 })
    }

    const spineItemNavigation = spineItemNavigator.getNavigationForPage(pageIndex, spineItem)
    const readingOffset = locator.getSpinePositionFromSpineItemPosition(spineItemNavigation, spineItem)

    return getAdjustedPositionForSpread(readingOffset)
  }

  const getNavigationForLastPage = (spineItem: SpineItem): ViewportNavigationEntry => {
    const spineItemNavigation = spineItemNavigator.getNavigationForLastPage(spineItem)
    const position = locator.getSpinePositionFromSpineItemPosition(spineItemNavigation, spineItem)

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForSpineIndexOrId = (indexOrId: number | string): ViewportNavigationEntry => {
    const spineItem = spineItemManager.get(indexOrId)
    if (spineItem) {
      const position = locator.getSpinePositionFromSpineItem(spineItem)

      return { ...getAdjustedPositionForSpread(position), spineItem }
    }

    return { x: 0, y: 0 }
  }

  const getNavigationForRightSinglePage = (position: SpinePosition): ViewportNavigationEntry => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection
    const spineItem = locator.getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()
    const defaultNavigation = position

    if (!spineItem) {
      return defaultNavigation
    }

    // translate viewport position into reading item local position
    const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(position, spineItem)
    // get reading item local position for right page
    const spineItemNavigationForRightPage = spineItemNavigator.getNavigationForRightPage(spineItemPosition, spineItem)
    // check both position to see if we moved out of it
    const isNewNavigationInCurrentItem = arePositionsDifferent(spineItemNavigationForRightPage, spineItemPosition)

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        pageTurnDirection === `horizontal`
          ? { x: position.x + context.getPageSize().width, y: 0 }
          : { y: position.y + context.getPageSize().height, x: 0 },
      )
    } else {
      const readingOrderPosition = locator.getSpinePositionFromSpineItemPosition(spineItemNavigationForRightPage, spineItem)

      return readingOrderPosition
    }
  }

  const getNavigationForLeftSinglePage = (position: UnsafeSpinePosition): ViewportNavigationEntry => {
    const pageTurnDirection = context.getSettings().computedPageTurnDirection
    const spineItem = locator.getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()
    const defaultNavigation = { ...position, spineItem }

    if (!spineItem) {
      return defaultNavigation
    }

    const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(position, spineItem)
    const spineItemNavigation = spineItemNavigator.getNavigationForLeftPage(spineItemPosition, spineItem)
    const isNewNavigationInCurrentItem = arePositionsDifferent(spineItemNavigation, spineItemPosition)

    if (!isNewNavigationInCurrentItem) {
      return wrapPositionWithSafeEdge(
        pageTurnDirection === `horizontal`
          ? { x: position.x - context.getPageSize().width, y: 0 }
          : { y: position.y - context.getPageSize().height, x: 0 },
      )
    } else {
      const readingOrderPosition = locator.getSpinePositionFromSpineItemPosition(spineItemNavigation, spineItem)

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
  const getNavigationForRightPage = (position: SpinePosition): ViewportNavigationEntry => {
    const spineItemOnPosition = locator.getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()

    const navigation = getNavigationForRightSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (spineItemOnPosition?.isUsingVerticalWriting() && position.x === navigation.x) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.shouldDisplaySpread()) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (spineItemOnPosition?.isUsingVerticalWriting() && position.x !== navigation.x) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? {
                  ...navigation,
                  x: navigation.x - context.getPageSize().width,
                }
              : {
                  ...navigation,
                  x: navigation.x + context.getPageSize().width,
                },
          ),
        )
      }

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (context.getSettings().computedPageTurnDirection === `vertical` && position.y !== navigation.y) {
        return getAdjustedPositionForSpread(navigation)
      }

      const doubleNavigation = getNavigationForRightSinglePage(navigation)

      return getAdjustedPositionForSpread(doubleNavigation)
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
  const getNavigationForLeftPage = (position: UnsafeSpinePosition): SpinePosition => {
    const spineItemOnPosition = locator.getSpineItemFromPosition(position) || spineItemManager.getFocusedSpineItem()

    const navigation = getNavigationForLeftSinglePage(position)

    // when we move withing vertical content, because only y moves, we don't need two navigation
    if (spineItemOnPosition?.isUsingVerticalWriting() && position.x === navigation.x) {
      return getAdjustedPositionForSpread(navigation)
    }

    if (context.shouldDisplaySpread()) {
      // in case of spread the entire screen is taken as one real page for vertical content
      // in order to move out from it we add an extra page width.
      // using `getNavigationForLeftSinglePage` again would keep x as it is and wrongly move y
      // for the next item in case it's also a vertical content
      if (spineItemOnPosition?.isUsingVerticalWriting() && position.x !== navigation.x) {
        return getAdjustedPositionForSpread(
          wrapPositionWithSafeEdge(
            context.isRTL()
              ? { ...navigation, x: navigation.x + context.getPageSize().width }
              : { ...navigation, x: navigation.x - context.getPageSize().width },
          ),
        )
      }

      /**
       * In vase we move vertically and the y is already different, we don't need a second navigation
       * since we already jumped to a new screen
       */
      if (context.getSettings().computedPageTurnDirection === `vertical` && position.y !== navigation.y) {
        return getAdjustedPositionForSpread(navigation)
      }

      const doubleNavigation = getNavigationForLeftSinglePage(navigation)

      return getAdjustedPositionForSpread(doubleNavigation)
    }

    return getAdjustedPositionForSpread(navigation)
  }

  const getNavigationForUrl = (url: string | URL): (ViewportNavigationEntry & { url: URL }) | undefined => {
    try {
      const validUrl = url instanceof URL ? url : new URL(url)
      const urlWithoutAnchor = `${validUrl.origin}${validUrl.pathname}`
      const existingSpineItem = context.getManifest()?.spineItems.find((item) => item.href === urlWithoutAnchor)

      if (existingSpineItem) {
        const spineItem = spineItemManager.get(existingSpineItem.id)
        if (spineItem) {
          const position = getNavigationForAnchor(validUrl.hash, spineItem)

          return { ...getAdjustedPositionForSpread(position), url: validUrl }
        }
      }

      return undefined
    } catch (e) {
      Report.error(e)

      return undefined
    }
  }

  const getNavigationForAnchor = (anchor: string, spineItem: SpineItem) => {
    const position = locator.getSpinePositionFromSpineItemAnchor(anchor, spineItem)

    return getAdjustedPositionForSpread(position)
  }

  const getNavigationForPosition = (viewportPosition: ViewportPosition) => {
    const spineItem = locator.getSpineItemFromPosition(viewportPosition)

    if (spineItem) {
      const spineItemPosition = locator.getSpineItemPositionFromSpinePosition(viewportPosition, spineItem)
      const spineItemValidPosition = spineItemNavigator.getNavigationForPosition(spineItem, spineItemPosition)
      const viewportNavigation = locator.getSpinePositionFromSpineItemPosition(spineItemValidPosition, spineItem)

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
    const triggerXPosition =
      pageTurnDirection === `horizontal` ? viewportPosition.x + context.getVisibleAreaRect().width * triggerPercentage : 0
    const triggerYPosition =
      pageTurnDirection === `horizontal` ? 0 : viewportPosition.y + context.getVisibleAreaRect().height * triggerPercentage
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
    arePositionsDifferent,
  }
}
