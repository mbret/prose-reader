import { Report } from "../report"
import { Context } from "../context"
import { Pagination } from "../pagination"
import { ReadingItemManager } from "../readingItemManager"
import { createLocator } from "./locator"
import { createNavigator } from "./navigator"
import { EMPTY, merge, Observable, of, Subject, timer } from "rxjs"
import { ReadingItem } from "../readingItem"
import { delay, delayWhen, filter, switchMap, take, takeUntil, tap } from "rxjs/operators"

const NAMESPACE = `viewportNavigator`

type SubjectEvent =
  | { type: 'navigation', position: { x: number, y: number, readingItem?: ReadingItem }, animate: boolean }
  | { type: 'adjustStart', position: { x: number, y: number, readingItem?: ReadingItem }, animation: `auto` | `none` }
  | { type: 'adjustEnd', position: { x: number, y: number, readingItem?: ReadingItem } }

export const createViewportNavigator = ({ readingItemManager, context, pagination, element }: {
  readingItemManager: ReadingItemManager,
  pagination: Pagination,
  context: Context,
  element: HTMLElement
}) => {
  const navigator = createNavigator({ context, readingItemManager })
  const locator = createLocator({ context, readingItemManager })
  let ongoingNavigation: undefined | { animate: boolean } = undefined
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  let currentNavigationPosition: { x: number, y: number, readingItem?: ReadingItem } = { x: 0, y: 0 }
  const subject = new Subject<SubjectEvent>()
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

  /**
   * Keep in mind that the viewport position IS NOT necessarily the current navigation position.
   * Because there could be an animation running the viewport may be late. To retrieve the current position
   * use the dedicated property.
   */
  const getCurrentViewportPosition = () => ({
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
    const navigation = navigator.getNavigationForLeftPage(currentNavigationPosition)

    turnTo(navigation, { allowReadingItemChange })
  })

  const turnRight = Report.measurePerformance(`${NAMESPACE} turnRight`, 10, ({ allowReadingItemChange = true }: { allowReadingItemChange?: boolean } = {}) => {
    const navigation = navigator.getNavigationForRightPage(currentNavigationPosition)

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

  const goToCfi = (cfi: string, options: { animate: boolean } = { animate: true }) => {
    const navigation = navigator.getNavigationForCfi(cfi)
    Report.log(NAMESPACE, `goToCfi`, { cfi, navigation })
    lastUserExpectedNavigation = { type: 'navigate-from-cfi', data: cfi }
    navigateTo(navigation, options)
  }

  const goToSpineItem = (indexOrId: number | string, options: { animate: boolean } = { animate: true }) => {
    const navigation = navigator.getNavigationForSpineIndexOrId(indexOrId)
    // always want to be at the beginning of the item
    lastUserExpectedNavigation = { type: 'navigate-from-previous-item' }

    navigateTo(navigation, options)
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

  let moveToInitialViewportOffset: number | undefined = undefined

  /**
   * @prototype
   */
  const moveTo = ({ offset, startOffset }: { startOffset: number, offset: number }, { final }: { final?: boolean } = {}) => {
    if (moveToInitialViewportOffset === undefined) {
      moveToInitialViewportOffset = getCurrentViewportPosition().x
    }

    let navigation = { x: (offset - startOffset) + moveToInitialViewportOffset, y: 0 }

    if (final) {
      moveToInitialViewportOffset = undefined
    }

    // console.log(moveToInitialViewportOffset, (offset - startOffset) + moveToInitialViewportOffset)

    if (final) {
      const { x: offsetAtMidScreen } = navigator.wrapPositionWithSafeEdge({ x: navigation.x + context.getPageSize().width / 2, y: 0 })
      const readingItem = locator.getReadingItemFromOffset(offsetAtMidScreen) || readingItemManager.getFocusedReadingItem()
      const index = readingItemManager.getReadingItemIndex(readingItem)

      // console.log(`moveTo`, { offsetAtMidScreen, index, navigation })

      if (index !== undefined) {
        navigation = navigator.getNavigationForSpineIndexOrId(index)

        lastUserExpectedNavigation = undefined

        return navigateTo(navigation)
      }
    }

    // adjustReadingOffset(navigation)
  }

  /**
   * @todo optimize this function to not being called several times
   */
  const navigateTo = Report.measurePerformance(`navigateTo`, 10, (navigation: { x: number, y: number, readingItem?: ReadingItem }, { animate }: { animate: boolean } = { animate: true }) => {
    currentNavigationPosition = navigation

    subject.next({ type: 'navigation', position: navigation, animate })
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
    const lastCfi = pagination.getBeginInfo().cfi
    let adjustedReadingOrderViewPosition = currentNavigationPosition
    let offsetInReadingItem = 0

    /**
     * When `navigate-from-cfi` we always try to retrieve offset from cfi node and navigate
     * to there
     */
    if (lastUserExpectedNavigation?.type === 'navigate-from-cfi') {
      adjustedReadingOrderViewPosition = navigator.getNavigationForCfi(lastUserExpectedNavigation.data)
      Report.log(NAMESPACE, `navigate-from-cfi`, `use last cfi`)
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-next-item') {
      /**
       * When `navigate-from-next-item` we always try to get the offset of the last page, that way
       * we ensure reader is always redirected to last page
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForLastPage(readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `navigate-from-next-item`, {})
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-previous-item') {
      /**
       * When `navigate-from-previous-item'` 
       * we always try stay on the first page of the item
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForPage(0, readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `navigate-from-previous-item`, {})
    } else if (lastUserExpectedNavigation?.type === 'navigate-from-anchor') {
      /**
       * When `navigate-from-anchor` we just stay on the current reading item and try to get
       * the offset of that anchor.
       */
      const anchor = lastUserExpectedNavigation.data
      adjustedReadingOrderViewPosition = navigator.getNavigationForAnchor(anchor, readingItem)
    } else if (lastCfi) {
      /**
       * When there is no last navigation then we first look for any existing CFI. If there is a cfi we try to retrieve
       * the offset and navigate the user to it
       * @todo handle vertical writing, we are always redirected to page 1 currently
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForCfi(lastCfi)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `use last cfi`)
    } else {
      /**
       * Last resort case, there is no CFI so we check the current page and try to navigate to the closest one
       */
      // @todo get x of first visible element and try to get the page for this element
      // using the last page is not accurate since we could have less pages
      const currentPageIndex = pagination.getBeginInfo().pageIndex || 0
      adjustedReadingOrderViewPosition = navigator.getNavigationForPage(currentPageIndex, readingItem)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `use guess strategy`, {})
    }

    Report.log(NAMESPACE, `adjustReadingOffsetPosition`, { offsetInReadingItem, expectedReadingOrderViewOffset: adjustedReadingOrderViewPosition, lastUserExpectedNavigation })

    currentNavigationPosition = adjustedReadingOrderViewPosition

    subject.next({ type: `adjustStart`, position: adjustedReadingOrderViewPosition, animation: `auto` })
  }

  const adjustEnd$ = subject.pipe(filter(event => event.type === `adjustEnd`))

  const navigation$ = subject
    .pipe(
      filter(event => event.type === `navigation`),
      switchMap((event) => {
        const navigationEvent = event as Extract<SubjectEvent, { type: `navigation` }>
        ongoingNavigation = { animate: navigationEvent.animate }

        subject.next({ type: `adjustStart`, position: event.position, animation: navigationEvent.animate ? `auto` : `none` })

        return adjustEnd$.pipe(take(1))
      }),
      tap(() => {
        ongoingNavigation = undefined
      })
    )

  const adjust$ = subject
    .pipe(
      filter(event => event.type === `adjustStart`),
      switchMap((event) => {
        const noAdjustmentNeeded = !areNavigationDifferent(event.position, getCurrentViewportPosition())
        const animationDuration = context.getComputedPageTurnAnimationDuration()
        const shouldAnimate =
          (event.type === `adjustStart` && event.animation === `none`)
            || ongoingNavigation?.animate === false
            || !ongoingNavigation
            || context.getPageTurnAnimation() === `none`
            ? false
            : true

        if (shouldAnimate && !noAdjustmentNeeded) {
          if (context.getPageTurnAnimation() === `fade`) {
            element.style.setProperty('transition', `opacity ${animationDuration}ms`)
            element.style.setProperty('opacity', '0')
          } else if (context.getPageTurnAnimation() === `slide`) {
            element.style.setProperty('transition', `transform ${animationDuration}ms`)
            element.style.setProperty('opacity', '1')
          }
        } else {
          element.style.setProperty('transition', `none`)
          element.style.setProperty('opacity', `1`)
        }

        if (noAdjustmentNeeded) {
          return of(event)
            .pipe(
              tap(() => {
                subject.next({ type: `adjustEnd`, position: event.position })
              }),
              delay(animationDuration),
            )
        }

        return of(event)
          .pipe(
            tap(() => {
              if (context.getPageTurnAnimation() !== `fade`) {
                adjustReadingOffset(event.position)
              }
            }),
            delayWhen(() => shouldAnimate ? timer(animationDuration) : EMPTY),
            tap(() => {
              if (context.getPageTurnAnimation() === `fade`) {
                adjustReadingOffset(event.position)
              }
              subject.next({ type: `adjustEnd`, position: event.position })
            })
          )
      }),
      tap(() => {
        element.style.setProperty('opacity', '1')
      })
    )

  merge(navigation$, adjust$)
    .pipe(
      takeUntil(context.destroy$)
    )
    .subscribe()

  return {
    getCurrentViewportPosition,
    getCurrentNavigationPosition: () => currentNavigationPosition,
    turnLeft,
    turnRight,
    goTo,
    goToSpineItem,
    goToUrl,
    goToCfi,
    goToPageOfCurrentChapter,
    adjustReadingOffsetPosition,
    moveTo,
    getLastUserExpectedNavigation: () => lastUserExpectedNavigation,
    $: subject.asObservable(),
  }
}