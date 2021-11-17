import { Report } from "../../report"
import { Context } from "../../context"
import { Pagination } from "../../pagination"
import { ReadingItemManager } from "../../readingItemManager"
import { createLocationResolver } from "../locationResolver"
import { createNavigationResolver, ViewportNavigationEntry } from "../navigationResolver"
import { animationFrameScheduler, BehaviorSubject, combineLatest, EMPTY, identity, merge, Observable, of, Subject } from "rxjs"
import { ReadingItem } from "../../readingItem"
import { delay, distinctUntilChanged, filter, map, pairwise, share, shareReplay, startWith, switchMap, takeUntil, tap, withLatestFrom, skip } from "rxjs/operators"
import { createCfiLocator } from "../cfiLocator"
import { createScrollViewportNavigator } from "./scrollViewportNavigator"
import { createManualViewportNavigator } from "./manualViewportNavigator"
import { Hook } from "../../types/Hook"
import { createPanViewportNavigator } from "./panViewportNavigator"

const NAMESPACE = `viewportNavigator`

export const createViewportNavigator = ({ readingItemManager, context, pagination, element, cfiLocator, locator, hooks$ }: {
  readingItemManager: ReadingItemManager,
  pagination: Pagination,
  context: Context,
  element: HTMLElement,
  cfiLocator: ReturnType<typeof createCfiLocator>
  locator: ReturnType<typeof createLocationResolver>,
  hooks$: Observable<Hook[]>
}) => {
  let currentViewportPositionMemoUnused: { x: number, y: number } | undefined
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  let currentNavigationPosition: ViewportNavigationEntry = { x: -1, y: 0 }
  const currentNavigationSubject$ = new BehaviorSubject(currentNavigationPosition)
  const navigator = createNavigationResolver({ context, readingItemManager, cfiLocator, locator })
  const adjustNavigationSubject$ = new Subject<{ position: ViewportNavigationEntry, animate: boolean }>()

  /**
   * Keep in mind that the viewport position IS NOT necessarily the current navigation position.
   * Because there could be an animation running the viewport may be late. To retrieve the current position
   * use the dedicated property.
   */
  const getCurrentViewportPosition = Report.measurePerformance(`${NAMESPACE} getCurrentViewportPosition`, 1, () => {
    if (currentViewportPositionMemoUnused && currentViewportPositionMemoUnused?.x !== (~~(Math.abs(element.getBoundingClientRect().x) * 10) / 10)) {
      // console.error(`FOOOOO`, currentViewportPositionMemo?.x, ~~(Math.abs(element.getBoundingClientRect().x) * 10) / 10)
    }
    // if (currentViewportPositionMemo) return currentViewportPositionMemo

    if (context.getSettings().computedPageTurnMode === `scrollable`) {
      const newValue = { x: element.scrollLeft, y: element.scrollTop }
      currentViewportPositionMemoUnused = newValue

      return currentViewportPositionMemoUnused
    }

    const { x, y } = element.getBoundingClientRect()

    const newValue = {
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      // @see https://stackoverflow.com/questions/13847053/difference-between-and-math-floor for ~~
      x: ~~(Math.abs(x) * 10) / 10,
      y: ~~(Math.abs(y) * 10) / 10
    }
    currentViewportPositionMemoUnused = newValue

    return currentViewportPositionMemoUnused
  })

  const panViewportNavigator = createPanViewportNavigator({
    context,
    element,
    navigator,
    readingItemManager,
    locator,
    getCurrentViewportPosition,
    currentNavigationSubject$
  })
  const scrollViewportNavigator = createScrollViewportNavigator({ context, element, navigator, currentNavigationSubject$ })
  const manualViewportNavigator = createManualViewportNavigator({ context, element, navigator, currentNavigationSubject$, readingItemManager, locator })

  const viewportNavigators = [scrollViewportNavigator, panViewportNavigator, manualViewportNavigator]
  const viewportNavigatorsSharedState$ = merge(...viewportNavigators.map(({ $: { state$ } }) => state$))

  let lastUserExpectedNavigation:
    | undefined
    // always adjust at the first page
    | { type: `navigate-from-previous-item` }
    // always adjust at the last page
    | { type: `navigate-from-next-item` }
    // always adjust using this cfi
    | { type: `navigate-from-cfi`, data: string }
    // always adjust using this anchor
    | { type: `navigate-from-anchor`, data: string }

  const makeItHot = <T>(source$: Observable<T>) => {
    source$.pipe(takeUntil(context.$.destroy$)).subscribe()

    return source$
  }

  /**
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  const adjustReadingOffset = Report.measurePerformance(`adjustReadingOffset`, 2, ({ x, y }: { x: number, y: number }, hooks: Hook[]) => {
    currentViewportPositionMemoUnused = undefined

    const isAdjusted = viewportNavigators.reduce((isAdjusted, navigator) => {
      return navigator.adjustReadingOffset({ x, y }) || isAdjusted
    }, false)

    if (!isAdjusted) {
      if (context.isRTL()) {
        element.style.transform = `translate3d(${x}px, -${y}px, 0)`
      } else {
        element.style.transform = `translate3d(-${x}px, -${y}px, 0)`
      }
    }

    hooks.forEach(hook => {
      if (hook.name === `onViewportOffsetAdjust`) {
        hook.fn()
      }
    })
  }, { disable: true })

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
  const adjustNavigation = (readingItem: ReadingItem) => {
    // @todo we should get the cfi of focused item, if focused item is not inside pagination then go to spine index
    const lastCfi = pagination.getBeginInfo().cfi
    let adjustedReadingOrderViewPosition = currentNavigationPosition
    const offsetInReadingItem = 0

    if (context.getSettings().computedPageTurnMode === `scrollable`) {
      adjustedReadingOrderViewPosition = navigator.getMostPredominantNavigationForPosition(getCurrentViewportPosition())
    } else if (lastUserExpectedNavigation?.type === `navigate-from-cfi`) {
      /**
     * When `navigate-from-cfi` we always try to retrieve offset from cfi node and navigate
     * to there
     */
      adjustedReadingOrderViewPosition = navigator.getNavigationForCfi(lastUserExpectedNavigation.data)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-cfi`, `use last cfi`)
    } else if (lastUserExpectedNavigation?.type === `navigate-from-next-item`) {
      /**
       * When `navigate-from-next-item` we always try to get the offset of the last page, that way
       * we ensure reader is always redirected to last page
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForLastPage(readingItem)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-next-item`, {})
    } else if (lastUserExpectedNavigation?.type === `navigate-from-previous-item`) {
      /**
       * When `navigate-from-previous-item'`
       * we always try stay on the first page of the item
       */
      adjustedReadingOrderViewPosition = navigator.getNavigationForPage(0, readingItem)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-previous-item`, {})
    } else if (lastUserExpectedNavigation?.type === `navigate-from-anchor`) {
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
      Report.log(NAMESPACE, `adjustNavigation`, `use last cfi`)
    } else {
      // @todo we should get the page index of the focused item, if focus item is not inside pagination then go to spine index
      /**
       * Last resort case, there is no CFI so we check the current page and try to navigate to the closest one
       */
      // @todo get x of first visible element and try to get the page for this element
      // using the last page is not accurate since we could have less pages
      const currentPageIndex = pagination.getBeginInfo().pageIndex || 0
      adjustedReadingOrderViewPosition = navigator.getNavigationForPage(currentPageIndex, readingItem)
      Report.log(NAMESPACE, `adjustNavigation`, `use guess strategy`, {})
    }

    const areDifferent = navigator.arePositionsDifferent(adjustedReadingOrderViewPosition, currentNavigationPosition)

    Report.log(NAMESPACE, `adjustNavigation`, { areDifferent, offsetInReadingItem, expectedReadingOrderViewOffset: adjustedReadingOrderViewPosition, currentNavigationPosition, lastUserExpectedNavigation })

    if (areDifferent) {
      adjustNavigationSubject$.next({ position: adjustedReadingOrderViewPosition, animate: false })
    }

    return of({ previousNavigationPosition: currentNavigationPosition, adjustedReadingOrderViewPosition, areDifferent })
  }

  const layout = () => {
    currentViewportPositionMemoUnused = undefined

    if (context.getSettings().computedPageTurnMode === `scrollable`) {
      element.style.removeProperty(`transform`)
      element.style.removeProperty(`transition`)
    }
  }

  const navigation$: Observable<{
    position: { x: number, y: number, readingItem?: ReadingItem },
    triggeredBy: `manual` | `adjust` | `scroll`,
    animation: false | `turn` | `snap`
  }> = merge(
    panViewportNavigator.$.navigation$
      .pipe(
        map((event) => ({
          ...event,
          position: { x: event.x, y: event.y, readingItem: event.readingItem },
          animation: `snap` as const,
          triggeredBy: `manual` as const
        }))
      ),
    manualViewportNavigator.$.navigation$
      .pipe(
        map((event) => ({
          ...event,
          position: { x: event.x, y: event.y, readingItem: event.readingItem },
          animation: event.animate ? `turn` as const : false as false,
          triggeredBy: `manual` as const
        }))
      ),
    adjustNavigationSubject$
      .pipe(
        map((event) => ({
          ...event,
          triggeredBy: `adjust` as const,
          animation: event.animate ? `turn` as const : false as false
        }))
      ),
    scrollViewportNavigator.$.navigation$
      .pipe(
        map((event) => ({
          ...event,
          triggeredBy: `scroll` as const,
          animation: event.animate ? `turn` as const : false as false
        }))
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

  /**
   * Typically all manual navigation (user turn, user end of pan, etc).
   * We try to filter out all navigation that are asynchrone such as scrolling.
   * This is because we do not want to trigger adjust for them since they already adjust
   * the viewport on their own.
   */
  const navigationWhichRequireManualAdjust$ = navigation$
    .pipe(
      filter(({ triggeredBy }) => {
        if (
          triggeredBy === `scroll` ||
          (context.getSettings().computedPageTurnMode === `scrollable` && triggeredBy === `adjust`)
        ) {
          return false
        } else {
          return true
        }
      })
    )

  const manualAdjust$ = merge(
    panViewportNavigator.$.moveToSubject$.asObservable()
      .pipe(
        map(event => ({ ...event, animation: false as false }))
      ),
    navigationWhichRequireManualAdjust$
  )
    .pipe(
      map(({ animation, position }) => {
        const shouldAnimate =
          !(
            !animation ||
            (animation === `turn` && context.getSettings().computedPageTurnAnimation === `none`)
          )

        return {
          type: `manualAdjust` as const,
          shouldAnimate,
          animation,
          position
        }
      }),
      share()
    )

  const processManualAdjust$ = merge(
    manualAdjust$
  )
    .pipe(
      startWith(undefined),
      pairwise(),
      tap(([prevEvent, currentEvent]) => {
        // cleanup potential previous manual adjust
        if (prevEvent?.type === `manualAdjust` && currentEvent?.type !== `manualAdjust`) {
          element.style.setProperty(`transition`, `none`)
          element.style.setProperty(`opacity`, `1`)
        }
      }),
      switchMap(([, currentEvent]) => {
        if (currentEvent?.type !== `manualAdjust`) return EMPTY

        const animationDuration = currentEvent.animation === `snap`
          ? context.getSettings().computedSnapAnimationDuration
          : context.getSettings().computedPageTurnAnimationDuration
        const pageTurnAnimation = currentEvent.animation === `snap`
          ? `slide` as const
          : context.getSettings().computedPageTurnAnimation

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
            currentEvent.shouldAnimate ? delay(1, animationFrameScheduler) : identity,
            tap((data) => {
              // const noAdjustmentNeeded = !areNavigationDifferent(data.position, getCurrentViewportPosition())
              const noAdjustmentNeeded = false

              if (data.shouldAnimate && !noAdjustmentNeeded) {
                if (pageTurnAnimation === `fade`) {
                  element.style.setProperty(`transition`, `opacity ${animationDuration / 2}ms`)
                  element.style.setProperty(`opacity`, `0`)
                } else if (currentEvent.animation === `snap` || pageTurnAnimation === `slide`) {
                  element.style.setProperty(`transition`, `transform ${animationDuration}ms`)
                  element.style.setProperty(`opacity`, `1`)
                }
              } else {
                element.style.setProperty(`transition`, `none`)
                element.style.setProperty(`opacity`, `1`)
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
            withLatestFrom(hooks$),
            tap(([data, hooks]) => {
              if (pageTurnAnimation !== `fade`) {
                adjustReadingOffset(data.position, hooks)
              }
            }),
            currentEvent.shouldAnimate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
            tap(([data, hooks]) => {
              if (pageTurnAnimation === `fade`) {
                adjustReadingOffset(data.position, hooks)
                element.style.setProperty(`opacity`, `1`)
              }
            }),
            currentEvent.shouldAnimate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
            tap(([data, hooks]) => {
              if (pageTurnAnimation === `fade`) {
                adjustReadingOffset(data.position, hooks)
              }
            }),
            takeUntil(
              viewportNavigatorsSharedState$.pipe(
                filter(state => state === `start`),
                skip(1)
              )
            )
          )
      }),
      share(),
      takeUntil(context.$.destroy$)
    )

  /**
   * Observe the state of adjustment.
   * This is used to know whether the viewport is being adjusted by whatever means.
   */
  const adjustmentState$ = merge(
    merge(manualAdjust$)
      .pipe(
        map(() => `start` as const)
      ),
    merge(
      processManualAdjust$
    )
      .pipe(
        map(() => `end` as const)
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
    ...viewportNavigators.map(({ $: { state$ } }) => state$),
    adjustmentState$
  ])
    .pipe(
      map((states) => states.every(state => state === `end`) ? `free` : `busy`),
      distinctUntilChanged(),
      shareReplay(1),
      /**
       * @important
       * Since state$ is being updated from navigation$ and other exported streams we need it to be
       * hot so it always have the correct value no matter when someone subscribe later.
       * We cannot wait for the cold stream to start after a navigation already happened for example.
       */
      makeItHot
    )

  const destroy = () => {
    adjustNavigationSubject$.complete()
    viewportNavigators.forEach(navigator => navigator.destroy())
  }

  return {
    destroy,
    layout,
    getCurrentNavigationPosition: () => currentNavigationPosition,
    getCurrentViewportPosition,
    turnLeft: manualViewportNavigator.turnLeft,
    turnRight: manualViewportNavigator.turnRight,
    goToPage: manualViewportNavigator.goToPage,
    goToSpineItem: manualViewportNavigator.goToSpineItem,
    goToUrl: manualViewportNavigator.goToUrl,
    goToCfi: manualViewportNavigator.goToCfi,
    goToPageOfCurrentChapter: manualViewportNavigator.goToPageOfCurrentChapter,
    adjustNavigation,
    moveTo: panViewportNavigator.moveTo,
    getLastUserExpectedNavigation: () => lastUserExpectedNavigation,
    $: {
      state$,
      navigation$
    }
  }
}
