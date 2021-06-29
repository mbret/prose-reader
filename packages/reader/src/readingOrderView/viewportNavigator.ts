import { Report } from "../report"
import { Context } from "../context"
import { Pagination } from "../pagination"
import { ReadingItemManager } from "../readingItemManager"
import { createLocator } from "./locator"
import { createNavigator } from "./navigator"
import { animationFrameScheduler, BehaviorSubject, combineLatest, EMPTY, merge, of, Subject, timer } from "rxjs"
import { ReadingItem } from "../readingItem"
import { delayWhen, filter, switchMap, take, takeUntil, tap, throttleTime } from "rxjs/operators"
import { VIEWPORT_ADJUSTMENT_THROTTLE } from "../constants"

const NAMESPACE = `viewportNavigator`

type SubjectEvent =
  | { type: 'navigation', position: { x: number, y: number, readingItem?: ReadingItem }, animate: boolean }
  | { type: 'adjustStart', position: { x: number, y: number, readingItem?: ReadingItem }, animation: `auto` | `none` }
  | { type: 'adjustEnd', position: { x: number, y: number, readingItem?: ReadingItem } }

type Hook =
  | {
    name: `onViewportOffsetAdjust`,
    fn: () => void
  }
  | {
    name: `onViewportAdjustStart`,
    fn: (params: { animate: boolean }) => void
  }
  | {
    name: `onViewportAdjustEnd`,
    fn: () => void
  }

export const createViewportNavigator = ({ readingItemManager, context, pagination, element }: {
  readingItemManager: ReadingItemManager,
  pagination: Pagination,
  context: Context,
  element: HTMLElement
}) => {
  const navigator = createNavigator({ context, readingItemManager })
  const locator = createLocator({ context, readingItemManager })
  let hooks: Hook[] = []
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
  let isMovingPan = false
  const pan$ = new BehaviorSubject<`moving` | `end` | `start`>(`end`)
  const adjust$ = new BehaviorSubject<`started` | `end`>(`end`)
  const state$ = new BehaviorSubject<`free` | `busy`>(`free`)

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

    hooks.forEach(hook => {
      if (hook.name === `onViewportOffsetAdjust`) {
        hook.fn()
      }
    })
  }, { disable: true })

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

    const newReadingItem = locator.getReadingItemFromPosition(navigation) || currentReadingItem
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

    Report.log(NAMESPACE, `goToCfi`, { cfi, options })

    lastUserExpectedNavigation = { type: 'navigate-from-cfi', data: cfi }
    navigateTo(navigation, options)
  }

  const goToSpineItem = (indexOrId: number | string, options: { animate: boolean } = { animate: true }) => {
    const navigation = navigator.getNavigationForSpineIndexOrId(indexOrId)
    // always want to be at the beginning of the item
    lastUserExpectedNavigation = { type: 'navigate-from-previous-item' }

    Report.log(NAMESPACE, `goToSpineItem`, { indexOrId, options, navigation })

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

  let movingLastDelta = { x: 0, y: 0 }
  let movingLastPosition = { x: 0, y: 0 }

  /**
   * @prototype
   */
  const moveTo = (delta: { x: number, y: number } | undefined, { final, start }: { start?: boolean, final?: boolean } = {}) => {
    const pageTurnDirection = context.getSettings().pageTurnDirection
    isMovingPan = true
    if (start) {
      pan$.next(`start`)
      movingLastDelta = { x: 0, y: 0 }
      movingLastPosition = getCurrentViewportPosition()
    }

    let navigation = currentNavigationPosition

    if (delta) {
      const correctedX = delta.x - (movingLastDelta?.x || 0)
      const correctedY = delta.y - (movingLastDelta?.y || 0)

      navigation = navigator.wrapPositionWithSafeEdge({
        x: pageTurnDirection === `horizontal`
          ? context.isRTL()
            ? movingLastPosition.x + correctedX
            : movingLastPosition.x - correctedX
          : 0,
        y: pageTurnDirection === `horizontal` ? 0 : movingLastPosition.y - correctedY
      })

      movingLastDelta = delta
    } else {
      navigation = getCurrentViewportPosition()
    }

    // console.log(navigation)

    movingLastPosition = navigation

    if (final) {
      const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
      const triggerPercentage = movingForward ? 0.7 : 0.3
      isMovingPan = false
      movingLastDelta = { x: 0, y: 0 }
      const triggerXPosition = pageTurnDirection === `horizontal`
        ? navigation.x + (context.getVisibleAreaRect().width * triggerPercentage)
        : 0
      const triggerYPosition = pageTurnDirection === `horizontal`
        ? 0
        : navigation.y + (context.getVisibleAreaRect().height * triggerPercentage)
      const midScreenPositionSafePosition = navigator.wrapPositionWithSafeEdge({ x: triggerXPosition, y: triggerYPosition })
      const finalNavigation = navigator.getNavigationForPosition(midScreenPositionSafePosition)

      // console.warn({ navigation, triggerXPosition, triggerYPosition, finalNavigation, movingForward, triggerPercentage })

      lastUserExpectedNavigation = undefined

      turnTo(finalNavigation)
      pan$.next(`end`)

      return
    }

    subject.next({ type: `adjustStart`, position: navigation, animation: `none` })
    pan$.next(`moving`)
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
  const adjustReadingOffsetPosition = (readingItem: ReadingItem, { }: {}) => {
    // @todo we should get the cfi of focused item, if focused item is not inside pagination then go to spine index
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
      // @todo, ignore cfi if the current focus item
      /**
       * When there is no last navigation then we first look for any existing CFI. If there is a cfi we try to retrieve
       * the offset and navigate the user to it
       * @todo handle vertical writing, we are always redirected to page 1 currently
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForCfi(lastCfi)
      Report.log(NAMESPACE, `adjustReadingOffsetPosition`, `use last cfi`)
    } else {
      // @todo we should get the page index of the focused item, if focus item is not inside pagination then go to spine index
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

  const registerHook = (hook: Hook) => {
    hooks.push(hook)
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
      }),
    )

  subject
    .pipe(
      filter(event => event.type === `adjustStart`),
      throttleTime(VIEWPORT_ADJUSTMENT_THROTTLE, animationFrameScheduler, { leading: true, trailing: true }),
      switchMap((event) => {
        adjust$.next(`started`)
        const noAdjustmentNeeded = !areNavigationDifferent(event.position, getCurrentViewportPosition())
        const animationDuration = context.getComputedPageTurnAnimationDuration()
        const shouldAnimate =
          (event.type === `adjustStart` && event.animation === `none`)
            || ongoingNavigation?.animate === false
            || !ongoingNavigation
            || context.getSettings().pageTurnAnimation === `none`
            ? false
            : true

        hooks.forEach(hook => {
          if (hook.name === `onViewportAdjustStart`) {
            hook.fn({ animate: shouldAnimate })
          }
        })

        if (shouldAnimate && !noAdjustmentNeeded) {
          if (context.getSettings().pageTurnAnimation === `fade`) {
            element.style.setProperty('transition', `opacity ${animationDuration / 2}ms`)
            element.style.setProperty('opacity', '0')
          } else if (context.getSettings().pageTurnAnimation === `slide`) {
            element.style.setProperty('transition', `transform ${animationDuration}ms`)
            element.style.setProperty('opacity', '1')
          }
        } else {
          element.style.setProperty('transition', `none`)
          element.style.setProperty('opacity', `1`)
        }

        // console.warn({ shouldAnimate, noAdjustmentNeeded, event })
        // if (noAdjustmentNeeded) {
        //   return of(event)
        //     .pipe(
        //       tap(() => {
        //         adjustReadingOffset(event.position)
        //         subject.next({ type: `adjustEnd`, position: event.position })
        //       }),
        //       delay(animationDuration),
        //     )
        // }

        // console.log({ shouldAnimate, anim: context.getSettings().pageTurnAnimation, duration: context.getComputedPageTurnAnimationDuration(), noAdjustmentNeeded })

        /**
         * @important
         * We always need to adjust the reading offset. Even if the current viewport value
         * is the same as the payload position. This is because an already running animation could
         * be active, meaning the viewport is still adjusting itself (after animation duration). So we
         * need to adjust to anchor to the payload position. This is because we use viewport computed position, 
         * not the value set by `setProperty`
         */
        return of(event)
          .pipe(
            tap(() => {
              if (context.getSettings().pageTurnAnimation !== `fade`) {
                adjustReadingOffset(event.position)
              }
            }),
            delayWhen(() => shouldAnimate ? timer(animationDuration / 2) : EMPTY),
            tap(() => {
              if (context.getSettings().pageTurnAnimation === `fade`) {
                adjustReadingOffset(event.position)
                element.style.setProperty('opacity', '1')
              }
            }),
            delayWhen(() => shouldAnimate ? timer(animationDuration / 2) : EMPTY),
            tap(() => {
              if (context.getSettings().pageTurnAnimation === `fade`) {
                adjustReadingOffset(event.position)
              }
              hooks.forEach(hook => {
                if (hook.name === `onViewportAdjustEnd`) {
                  hook.fn()
                }
              })
              subject.next({ type: `adjustEnd`, position: event.position })
              adjust$.next(`end`)
            })
          )
      }),
      tap(() => {
        // element.style.setProperty('opacity', '1')
      }),
      takeUntil(context.$.destroy$),
    )
    .subscribe()

  merge(navigation$)
    .pipe(
      takeUntil(context.$.destroy$)
    )
    .subscribe()

  combineLatest(pan$, adjust$).pipe(
    tap(([pan, adjust]) => {
      // console.warn(`state$`, pan, adjust)
      state$.next(pan === `end` && adjust === `end` ? `free` : `busy`)
    }),
    takeUntil(context.$.destroy$)
  ).subscribe()

  const destroy = () => {
    hooks = []
    subject.complete()
    pan$.complete()
    state$.complete()
  }

  return {
    destroy,
    registerHook,
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
    $: {
      $: subject.asObservable(),
      pan$: pan$.asObservable(),
      state$: state$.asObservable(),
      adjust$: adjust$.asObservable(),
    },
  }
}