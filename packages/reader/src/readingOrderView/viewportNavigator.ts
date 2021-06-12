import { Report } from "../report"
import { Context } from "../context"
import { Pagination } from "../pagination"
import { ReadingItemManager } from "../readingItemManager"
import { createLocator } from "./locator"
import { createNavigator } from "./navigator"
import { Subject } from "rxjs"
import { ReadingItem } from "../readingItem"

const NAMESPACE = `viewportNavigator`

export const createViewportNavigator = ({ readingItemManager, context, pagination, element }: {
  readingItemManager: ReadingItemManager,
  pagination: Pagination,
  context: Context,
  element: HTMLElement
}) => {
  const navigator = createNavigator({ context, readingItemManager })
  const locator = createLocator({ context, readingItemManager })
  let isFirstNavigation = true
  const subject = new Subject<{ event: 'navigation', data: { x: number, y: number, readingItem?: ReadingItem } } | { event: 'adjust', data: { x: number, y: number } }>()
  let lastUserExpectedNavigation:
    | undefined
    // always adjust at the first page
    | { type: 'navigate-from-previous-item' }
    // always adjust at the last page
    | { type: 'navigate-from-next-item' }
    // always adjust using this cfi
    | { type: 'navigate-from-cfi', data: string }
    // always adjust using this anchor
    | { type: 'navigate-from-anchor', data: string }
    = undefined

  /**
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  const adjustReadingOffset = Report.measurePerformance(`adjustReadingOffset`, 10, ({ x, y }: { x: number, y: number }) => {
    if (context.isRTL()) {
      element.style.transform = `translate3d(${x}px, -${y}px, 0)`
    } else {
      element.style.transform = `translate3d(-${x}px, -${y}px, 0)`
    }
  })

  const areNavigationDifferent = (a: { x: number, y: number }, b: { x: number, y: number }) => a.x !== b.x || a.y !== b.y

  const getCurrentPosition = () => ({
    // we want to round to first decimal because it's possible to have half pixel
    // however browser engine can also gives back x.yyyy based on their precision
    x: Math.round(Math.abs(element.getBoundingClientRect().x) * 10) / 10,
    y: Math.round(Math.abs(element.getBoundingClientRect().y) * 10) / 10,
  })

  const turnTo = Report.measurePerformance(`turnTo`, 10, (navigation: { x: number, y: number }, { allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const currentReadingItem = readingItemManager.getFocusedReadingItem()

    if (!currentReadingItem) return

    const newReadingItem = locator.getReadingItemFromOffset(navigation.x) || currentReadingItem
    const readingItemHasChanged = newReadingItem !== currentReadingItem

    if (readingItemHasChanged) {
      if (allowReadingItemChange) {
        if (readingItemManager.comparePositionOf(newReadingItem, currentReadingItem) === 'before') {
          lastUserExpectedNavigation = { type: 'navigate-from-next-item' }
          navigateTo(navigation)
        } else {
          lastUserExpectedNavigation = { type: 'navigate-from-previous-item' }
          navigateTo(navigation)
        }
      }
    } else {
      lastUserExpectedNavigation = undefined
      navigateTo(navigation)
    }
  })

  const turnLeft = Report.measurePerformance(`${NAMESPACE} turnLeft`, 10, ({ allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const currentPosition = getCurrentPosition()
    const navigation = navigator.getNavigationForLeftPage(currentPosition)

    turnTo(navigation, { allowReadingItemChange })
  })

  const turnRight = Report.measurePerformance(`${NAMESPACE} turnRight`, 10, ({ allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const currentPosition = getCurrentPosition()
    const navigation = navigator.getNavigationForRightPage(currentPosition)

    turnTo(navigation, { allowReadingItemChange })
  })

  // @todo it's wrong because we can be in two different chapter on same page for spread
  const goToPageOfCurrentChapter = (pageIndex: number) => {
    const readingItem = readingItemManager.getFocusedReadingItem()

    if (readingItem) {
      const navigation = navigator.getNavigationForPage(pageIndex, readingItem)
      lastUserExpectedNavigation = undefined
      navigateTo(navigation)
    }
  }

  const goToCfi = (cfi: string) => {
    const navigation = navigator.getNavigationForCfi(cfi)
    Report.log(NAMESPACE, `goToCfi`, { cfi, navigation })
    lastUserExpectedNavigation = { type: 'navigate-from-cfi', data: cfi }
    navigateTo(navigation)
  }

  const goToSpineItem = (indexOrId: number | string) => {
    const navigation = navigator.getNavigationForSpineIndexOrId(indexOrId)
    // always want to be at the beginning of the item
    lastUserExpectedNavigation = { type: 'navigate-from-previous-item' }
    navigateTo(navigation)
  }

  const goTo = (spineIndexOrSpineItemIdOrCfi: number | string) => {
    if (typeof spineIndexOrSpineItemIdOrCfi === `string` && spineIndexOrSpineItemIdOrCfi.startsWith(`epubcfi`)) {
      goToCfi(spineIndexOrSpineItemIdOrCfi)
    } else {
      goToSpineItem(spineIndexOrSpineItemIdOrCfi)
    }
  }

  const goToUrl = (url: string | URL) => {
    const navigation = navigator.getNavigationForUrl(url)

    if (navigation) {
      lastUserExpectedNavigation = { type: 'navigate-from-anchor', data: navigation.url.hash }
      navigateTo(navigation)
    }
  }

  /**
   * @todo optimize this function to not being called several times
   */
  const navigateTo = Report.measurePerformance(`navigateTo`, 10, (navigation: { x: number, y: number, readingItem?: ReadingItem }) => {
    if (!isFirstNavigation && !areNavigationDifferent(navigation, getCurrentPosition())) {
      Report.warn(NAMESPACE, `prevent useless navigation`)

      subject.next({ event: 'navigation', data: navigation })

      return
    }

    isFirstNavigation = false

    adjustReadingOffset(navigation)

    subject.next({ event: 'navigation', data: navigation })
  })

  /**
   * Verify that current offset is within the current reading item and is at 
   * desired pagination.
   * If it is not, then we adjust the offset.
   * The offset could be wrong in the case of there has been re-layout.
   * In this case we always need to make sure to be synchronized with pagination.
   * Pagination is in theory always right because when we move the offset we directly update
   * the pagination. It's after, when re-layout happens for various reason that the page can be at
   * the wrong offset
   * @todo this is being called a lot, try to optimize
   */
  const adjustReadingOffsetPosition = (readingItem: ReadingItem, { shouldAdjustCfi }: { shouldAdjustCfi: boolean }) => {
    const currentViewportPosition = getCurrentPosition()
    const lastCfi = pagination.getBeginInfo().cfi
    let expectedReadingOrderViewPosition = currentViewportPosition
    let offsetInReadingItem = 0

    /**
     * When `navigate-from-cfi` we always try to retrieve offset from cfi node and navigate
     * to there
     */
    if (lastUserExpectedNavigation?.type === 'navigate-from-cfi') {
      expectedReadingOrderViewPosition = navigator.getNavigationForCfi(lastUserExpectedNavigation.data)
      Report.log(NAMESPACE, `navigate-from-cfi`, `use last cfi`)
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-next-item') {
      /**
       * When `navigate-from-next-item` we always try to get the offset of the last page, that way
       * we ensure reader is always redirected to last page
       */
      expectedReadingOrderViewPosition = navigator.getNavigationForLastPage(readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `navigate-from-next-item`, {})
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-previous-item') {
      /**
       * When `navigate-from-previous-item'` 
       * we always try stay on the first page of the item
       */
      expectedReadingOrderViewPosition = navigator.getNavigationForPage(0, readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `navigate-from-previous-item`, {})
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-anchor') {
      /**
       * When `navigate-from-anchor` we just stay on the current reading item and try to get
       * the offset of that anchor.
       */
      const anchor = lastUserExpectedNavigation.data
      expectedReadingOrderViewPosition = navigator.getNavigationForAnchor(anchor, readingItem)
    } else if (lastCfi) {
      /**
       * When there is no last navigation then we first look for any existing CFI. If there is a cfi we try to retrieve
       * the offset and navigate the user to it
       * @todo handle vertical writing, we are always redirected to page 1 currently
       */
      expectedReadingOrderViewPosition = navigator.getNavigationForCfi(lastCfi)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `use last cfi`)
    } else {
      /**
       * Last resort case, there is no CFI so we check the current page and try to navigate to the closest one
       */
      // @todo get x of first visible element and try to get the page for this element
      // using the last page is not accurate since we could have less pages
      const currentPageIndex = pagination.getBeginInfo().pageIndex || 0
      expectedReadingOrderViewPosition = navigator.getNavigationForPage(currentPageIndex, readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `use guess strategy`, {})
    }

    Report.log(NAMESPACE, `adjustReadingOffsetPosition`, { offsetInReadingItem, expectedReadingOrderViewOffset: expectedReadingOrderViewPosition, lastUserExpectedNavigation })

    if (areNavigationDifferent(expectedReadingOrderViewPosition, currentViewportPosition)) {
      adjustReadingOffset(expectedReadingOrderViewPosition)
    }

    subject.next({ event: 'adjust', data: expectedReadingOrderViewPosition })
  }

  return {
    adjustOffset: adjustReadingOffset,
    getCurrentPosition,
    turnLeft,
    turnRight,
    goTo,
    goToSpineItem,
    goToUrl,
    goToCfi,
    goToPageOfCurrentChapter,
    adjustReadingOffsetPosition,
    getLastUserExpectedNavigation: () => lastUserExpectedNavigation,
    $: subject.asObservable(),
  }
}