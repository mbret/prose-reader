import { Report } from "../../report"
import { Context } from "../../context"
import { Pagination } from "../../pagination"
import { ReadingItemManager } from "../../readingItemManager"
import { createLocator } from "../locator"
import { createNavigator, ViewportNavigationEntry } from "../navigator"
import { animationFrameScheduler, BehaviorSubject, combineLatest, EMPTY, identity, merge, of, Subject } from "rxjs"
import { ReadingItem } from "../../readingItem"
import { debounceTime, delay, distinctUntilChanged, filter, map, pairwise, share, shareReplay, startWith, switchMap, takeUntil, tap } from "rxjs/operators"
import { createCfiLocator } from "../cfiLocator"
import { createScrollViewportNavigator, SCROLL_FINISHED_DEBOUNCE_TIMEOUT } from "./scrollViewportNavigator"
import { createManualViewportNavigator } from "./manualViewportNavigator"

const NAMESPACE = `viewportNavigator`

type Hook =
  | {
    name: `onViewportOffsetAdjust`,
    fn: () => void
  }

export const createViewportNavigator = ({ readingItemManager, context, pagination, element, cfiLocator, locator }: {
  readingItemManager: ReadingItemManager,
  pagination: Pagination,
  context: Context,
  element: HTMLElement,
  cfiLocator: ReturnType<typeof createCfiLocator>
  locator: ReturnType<typeof createLocator>
}) => {
  let hooks: Hook[] = []
  let currentViewportPositionMemo: { x: number, y: number } | undefined
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  let currentNavigationPosition: ViewportNavigationEntry = { x: -1, y: 0 }
  const currentNavigationSubject$ = new BehaviorSubject(currentNavigationPosition)
  const navigator = createNavigator({ context, readingItemManager, cfiLocator, locator })
  const scrollViewportNavigator = createScrollViewportNavigator({ context, element, navigator, currentNavigationSubject$ })
  const manualViewportNavigator = createManualViewportNavigator({ context, element, navigator, currentNavigationSubject$, readingItemManager, locator })
  const moveToSubject$ = new Subject<{ position: ViewportNavigationEntry, animation: `auto` | `none` }>()
  const navigateToSubject$ = new Subject<{ x: number, y: number, readingItem?: ReadingItem, animate?: boolean }>()
  const adjustNavigationSubject$ = new Subject<{ position: ViewportNavigationEntry, animate: boolean }>()
  const panSubject$ = new BehaviorSubject<`moving` | `end` | `start`>(`end`)

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
  const adjustReadingOffset = Report.measurePerformance(`adjustReadingOffset`, 2, ({ x, y }: { x: number, y: number }) => {
    currentViewportPositionMemo = undefined

    if (context.getComputedPageTurnMode() === `controlled`) {
      if (context.isRTL()) {
        element.style.transform = `translate3d(${x}px, -${y}px, 0)`
      } else {
        element.style.transform = `translate3d(-${x}px, -${y}px, 0)`
      }
    } else {
      scrollViewportNavigator.adjustReadingOffset({ x, y })
    }

    hooks.forEach(hook => {
      if (hook.name === `onViewportOffsetAdjust`) {
        hook.fn()
      }
    })
  }, { disable: true })

  /**
   * Keep in mind that the viewport position IS NOT necessarily the current navigation position.
   * Because there could be an animation running the viewport may be late. To retrieve the current position
   * use the dedicated property.
   */
  const getCurrentViewportPosition = Report.measurePerformance(`${NAMESPACE} getCurrentViewportPosition`, 1, () => {
    if (currentViewportPositionMemo) return currentViewportPositionMemo

    if (context.getComputedPageTurnMode() === `free`) {
      const newValue = { x: element.scrollLeft, y: element.scrollTop }
      currentViewportPositionMemo = newValue

      return currentViewportPositionMemo
    }

    const { x, y } = element.getBoundingClientRect()

    const newValue = {
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      // @see https://stackoverflow.com/questions/13847053/difference-between-and-math-floor for ~~
      x: ~~(Math.abs(x) * 10) / 10,
      y: ~~(Math.abs(y) * 10) / 10,
    }
    currentViewportPositionMemo = newValue

    return currentViewportPositionMemo
  })

  let movingLastDelta = { x: 0, y: 0 }
  let movingLastPosition = { x: 0, y: 0 }

  /**
   * @prototype
   */
  const moveTo = Report.measurePerformance(`${NAMESPACE} moveTo`, 5, (delta: { x: number, y: number } | undefined, { final, start }: { start?: boolean, final?: boolean } = {}) => {
    if (context.getComputedPageTurnMode() === `free`) {
      Report.warn(`pan control is not available on free page turn mode`)
      return
    }

    const pageTurnDirection = context.getSettings().pageTurnDirection
    if (start) {
      panSubject$.next(`start`)
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

    movingLastPosition = navigation

    if (final) {
      const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
      const triggerPercentage = movingForward ? 0.7 : 0.3
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

      // console.warn('MOVE TO END')
      const turnValue = manualViewportNavigator.turnTo(finalNavigation)
      if (turnValue) {
        navigateToSubject$.next(turnValue)
      }
      panSubject$.next(`end`)

      return
    }

    moveToSubject$.next({ position: navigation, animation: `none` })
    panSubject$.next(`moving`)
  }, { disable: false })

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
  const adjustNavigation = (readingItem: ReadingItem, { }: {}) => {
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

    Report.log(NAMESPACE, `adjustReadingOffsetPosition`, { offsetInReadingItem, expectedReadingOrderViewOffset: adjustedReadingOrderViewPosition, currentNavigationPosition, lastUserExpectedNavigation })

    const areDifferent = navigator.arePositionsDifferent(adjustedReadingOrderViewPosition, currentNavigationPosition)

    if (areDifferent) {
      adjustNavigationSubject$.next({ position: adjustedReadingOrderViewPosition, animate: false })
    }

    return of({ previousNavigationPosition: currentNavigationPosition, adjustedReadingOrderViewPosition, areDifferent })
  }

  const registerHook = (hook: Hook) => {
    hooks.push(hook)
  }

  const layout = () => {
    currentViewportPositionMemo = undefined

    if (context.getComputedPageTurnMode() === `free`) {
      element.style.transform = `translate3d(0px, 0px, 0)`
    }
  }

  const navigation$ = merge(
    merge(navigateToSubject$, manualViewportNavigator.$.navigation$)
      .pipe(
        map((event) => ({
          ...event,
          position: { x: event.x, y: event.y, readingItem: event.readingItem },
          animate: event.animate ?? true,
          triggeredBy: `manual` as const,
        }))
      ),
    adjustNavigationSubject$
      .pipe(
        map((event) => ({ ...event, triggeredBy: `adjust` as const }))
      ),
    scrollViewportNavigator.$.navigationOnScroll$
      .pipe(
        map((event) => ({ ...event, triggeredBy: `scroll` as const })),
      )
  )
    .pipe(
      tap((event) => {
        if (`lastUserExpectedNavigation` in event) {
          lastUserExpectedNavigation = event.lastUserExpectedNavigation
        }
        currentNavigationPosition = event.position
        currentNavigationSubject$.next(currentNavigationPosition)
      }),
      share(),
      takeUntil(context.$.destroy$)
    )

  navigation$.subscribe()

  const navigationWhichRequireManualAdjust$ = navigation$
    .pipe(
      filter(event => event.triggeredBy !== `scroll`),
    )

  const manualAdjust$ = merge(
    moveToSubject$.asObservable(),
    navigationWhichRequireManualAdjust$
      .pipe(
        map((event) => ({ position: event.position, animation: event.animate ? `auto` : `none` }))
      )
  )
    .pipe(
      map(({ animation, position }) => {
        // console.log(`manualAdjust$`, { animation })
        const shouldAnimate =
          (animation === `none`)
            // || ongoingNavigation?.animate === false
            // || !ongoingNavigation
            || context.getSettings().pageTurnAnimation === `none`
            ? false
            : true

        return {
          type: `manualAdjust` as const,
          animate: shouldAnimate,
          position,
        }
      }),
      share(),
    )

  const processUserScrollAdjust$ = scrollViewportNavigator.$.userScroll$
    .pipe(
      debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
      share(),
      takeUntil(context.$.destroy$)
    )

  processUserScrollAdjust$.subscribe()

  const processManualAdjust$ = merge(
    manualAdjust$,
    scrollViewportNavigator.$.userScroll$
      .pipe(
        map(() => ({ type: `scroll` as const })),
      )
  )
    .pipe(
      startWith(undefined),
      pairwise(),
      tap(([prevEvent, currentEvent]) => {
        // cleanup potential previous manual adjust
        if (prevEvent?.type === `manualAdjust` && currentEvent?.type !== `manualAdjust`) {
          element.style.setProperty('transition', `none`)
          element.style.setProperty('opacity', `1`)
        }
      }),
      switchMap(([, currentEvent]) => {

        if (currentEvent?.type !== `manualAdjust`) return EMPTY

        // console.log('processAdjust$', currentEvent)
        const animationDuration = context.getComputedPageTurnAnimationDuration()

        return of(currentEvent)
          .pipe(
            /**
             * @important
             * Optimization:
             * When the adjustment does not need animation it means we want to be there as fast as possible
             * One example is when we adjust position after layout. In this case we don't want to have flicker or see
             * anything for x ms while we effectively adjust. We want it to be immediate.
             * However when user is repeatedly turning page, we can improve smoothness by delaying a bit the adjustment
             */
            currentEvent.animate ? delay(1, animationFrameScheduler) : identity,
            tap((data) => {
              // const noAdjustmentNeeded = !areNavigationDifferent(data.position, getCurrentViewportPosition())
              const noAdjustmentNeeded = false
              // console.log(data.animate, noAdjustmentNeeded)

              if (data.animate && !noAdjustmentNeeded) {
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
            }),
            /**
             * @important
             * We always need to adjust the reading offset. Even if the current viewport value
             * is the same as the payload position. This is because an already running animation could
             * be active, meaning the viewport is still adjusting itself (after animation duration). So we
             * need to adjust to anchor to the payload position. This is because we use viewport computed position, 
             * not the value set by `setProperty`
             */
            tap((data) => {
              if (context.getSettings().pageTurnAnimation !== `fade`) {
                adjustReadingOffset(data.position)
              }
            }),
            currentEvent.animate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
            tap((data) => {
              if (context.getSettings().pageTurnAnimation === `fade`) {
                adjustReadingOffset(data.position)
                element.style.setProperty('opacity', '1')
              }
            }),
            currentEvent.animate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
            tap((data) => {
              if (context.getSettings().pageTurnAnimation === `fade`) {
                adjustReadingOffset(data.position)
              }
            }),
            takeUntil(scrollViewportNavigator.$.userScroll$)
          )
      }),
      share(),
      takeUntil(context.$.destroy$)
    )

  processManualAdjust$.subscribe()

  /**
   * Observe the state of adjustment.
   * This is used to know whether the viewport is being adjusted by whatever means.
   */
  const adjustmentState$ = merge(
    merge(scrollViewportNavigator.$.userScroll$, manualAdjust$)
      .pipe(
        map(() => ({ type: `start` as const }))
      ),
    merge(
      processUserScrollAdjust$,
      processManualAdjust$.pipe(delay(0)) // make sure it happens after manual adjust
    )
      .pipe(
        map(() => ({ type: `end` as const })),
      )
  )

  /**
   * Observe the viewport state.
   * Some actions such as adjustment, user pan moving, etc set the viewport as busy because they require
   * high responsiveness in order to avoid stuttering or fps drop. This observable let you know when is
   * a good time to perform heavy operation.
   * 
   * @returns
   * free means the viewport is not moving so it's safe to do computation
   * busy means the viewport is either controlled or animated, etc. 
   */
  const state$ = combineLatest([
    panSubject$.asObservable(),
    adjustmentState$.pipe(startWith({ type: `end` as const })),
  ])
    .pipe(
      // tap((e) => console.log(`state$`, e)),
      map(([pan, adjust]) => pan === `end` && adjust.type === `end` ? `free` : `busy`),
      distinctUntilChanged(),
      shareReplay(1),
    )

  // adjustmentState$.subscribe(e => console.log(`adjustmentState$`, e))
  // state$.subscribe(e => console.log(`state$`, e))

  const destroy = () => {
    hooks = []
    adjustNavigationSubject$.complete()
    navigateToSubject$.complete()
    moveToSubject$.complete()
    panSubject$.complete()
  }

  return {
    destroy,
    layout,
    registerHook,
    getCurrentNavigationPosition: () => currentNavigationPosition,
    turnLeft: manualViewportNavigator.turnLeft,
    turnRight: manualViewportNavigator.turnRight,
    goTo: manualViewportNavigator.goTo,
    goToSpineItem: manualViewportNavigator.goToSpineItem,
    goToUrl: manualViewportNavigator.goToUrl,
    goToCfi: manualViewportNavigator.goToCfi,
    goToPageOfCurrentChapter: manualViewportNavigator.goToPageOfCurrentChapter,
    adjustNavigation,
    moveTo,
    getLastUserExpectedNavigation: () => lastUserExpectedNavigation,
    $: {
      state$,
      navigation$,
    },
  }
}