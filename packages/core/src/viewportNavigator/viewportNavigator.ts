import { Report } from "../report"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/pagination"
import { SpineItemManager } from "../spineItemManager"
import { createLocationResolver } from "../spine/locationResolver"
import { createNavigationResolver, ViewportNavigationEntry } from "../spine/navigationResolver"
import {
  animationFrameScheduler,
  BehaviorSubject,
  combineLatest,
  EMPTY,
  identity,
  merge,
  Observable,
  of,
  Subject,
  take,
} from "rxjs"
import { SpineItem } from "../spineItem/createSpineItem"
import {
  delay,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  share,
  shareReplay,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
  skip,
} from "rxjs/operators"
import { createCfiLocator } from "../spine/cfiLocator"
import { createScrollViewportNavigator } from "./scrollViewportNavigator"
import { createManualViewportNavigator } from "./manualViewportNavigator"
import { createPanViewportNavigator } from "./panViewportNavigator"
import { HTML_PREFIX } from "../constants"
import { mapKeysTo } from "../utils/rxjs"
import { isShallowEqual } from ".."
import { LastUserExpectedNavigation, Navigation } from "./types"
import { Spine } from "../spine/createSpine"
import { isDefined } from "../utils/isDefined"
import { SettingsManager } from "../settings/SettingsManager"
import { HookManager } from "../hooks/HookManager"

const NAMESPACE = `viewportNavigator`

const noopElement = document.createElement("div")

export const createViewportNavigator = ({
  spineItemManager,
  context,
  pagination,
  parentElement$,
  cfiLocator,
  spineLocator,
  hookManager,
  spine,
  settings,
}: {
  spineItemManager: SpineItemManager
  pagination: Pagination
  context: Context
  parentElement$: BehaviorSubject<HTMLElement | undefined>
  cfiLocator: ReturnType<typeof createCfiLocator>
  spineLocator: ReturnType<typeof createLocationResolver>
  hookManager: HookManager
  spine: Spine
  settings: SettingsManager
}) => {
  const element$ = new BehaviorSubject<HTMLElement>(noopElement)
  const layoutSubject$ = new Subject<void>()
  let currentViewportPositionMemoUnused: { x: number; y: number } | undefined
  /**
   * This position correspond to the current navigation position.
   * This is always sync with navigation and adjustment but IS NOT necessarily
   * synced with current viewport. This is because viewport can be animated.
   * This value may be used to adjust / get current valid info about what should be visible.
   * This DOES NOT reflect necessarily what is visible for the user at instant T.
   */
  const currentNavigationPositionSubject$ = new BehaviorSubject<ViewportNavigationEntry>({
    x: -1,
    y: 0,
    spineItem: undefined,
  })
  const navigator = createNavigationResolver({
    context,
    settings,
    spineItemManager,
    cfiLocator,
    locator: spineLocator,
  })
  const adjustNavigationSubject$ = new Subject<{
    position: ViewportNavigationEntry
    animate: boolean
  }>()

  /**
   * Keep in mind that the viewport position IS NOT necessarily the current navigation position.
   * Because there could be an animation running the viewport may be late. To retrieve the current position
   * use the dedicated property.
   */
  const getCurrentViewportPosition = Report.measurePerformance(`${NAMESPACE} getCurrentViewportPosition`, 1, () => {
    if (settings.settings.computedPageTurnMode === `scrollable`) {
      return scrollViewportNavigator.getCurrentViewportPosition()
    }

    /**
     * `x` will be either negative or positive depending on which side we are translating.
     * For example LTR books which translate by moving up will have negative x. The viewport position
     * is not however negative (this is only because of translate). However it can be legit negative
     * for RTL
     */
    const { x, y } = element$.getValue()?.getBoundingClientRect() ?? { x: 0, y: 0 }

    const newValue = {
      // we want to round to first decimal because it's possible to have half pixel
      // however browser engine can also gives back x.yyyy based on their precision
      // @see https://stackoverflow.com/questions/13847053/difference-between-and-math-floor for ~~
      x: ~~(x * -1 * 10) / 10,
      // x: ~~(x * 10) / 10,
      y: ~~(Math.abs(y) * 10) / 10,
    }
    currentViewportPositionMemoUnused = newValue

    return currentViewportPositionMemoUnused
  })

  const panViewportNavigator = createPanViewportNavigator({
    context,
    settings,
    navigator,
    spineItemManager,
    locator: spineLocator,
    getCurrentViewportPosition,
    currentNavigationSubject$: currentNavigationPositionSubject$,
  })

  const scrollViewportNavigator = createScrollViewportNavigator({
    context,
    element$,
    navigator,
    currentNavigationSubject$: currentNavigationPositionSubject$,
    spine,
    spineItemManager,
    settings,
  })

  const manualViewportNavigator = createManualViewportNavigator({
    context,
    navigator,
    currentNavigationSubject$: currentNavigationPositionSubject$,
    spineItemManager,
    locator: spineLocator,
  })

  const viewportNavigators = [scrollViewportNavigator, panViewportNavigator, manualViewportNavigator]
  const viewportNavigatorsSharedState$ = merge(...viewportNavigators.map(({ $: { state$ } }) => state$))

  let lastUserExpectedNavigation: LastUserExpectedNavigation

  const makeItHot = <T>(source$: Observable<T>) => {
    source$.pipe(takeUntil(context.destroy$)).subscribe()

    return source$
  }

  /**
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  const adjustReadingOffset = Report.measurePerformance(
    `adjustReadingOffset`,
    2,
    ({ x, y }: { x: number; y: number }) => {
      const element = element$.getValue()

      if (!element) throw new Error("Invalid element")

      currentViewportPositionMemoUnused = undefined

      const isAdjusted = viewportNavigators.reduce((isAdjusted, navigator) => {
        return navigator.adjustReadingOffset({ x, y }) || isAdjusted
      }, false)

      if (!isAdjusted) {
        /**
         * @important
         * will work automatically with RTL since x will be negative.
         */
        element.style.transform = `translate3d(${-x}px, -${y}px, 0)`
      }

      hookManager.execute("onViewportOffsetAdjust", undefined, {})
    },
    { disable: true },
  )

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
  const adjustNavigation = (spineItem: SpineItem) => {
    // @todo we should get the cfi of focused item, if focused item is not inside pagination then go to spine index
    const lastCfi = pagination.getPaginationInfo().beginCfi
    let adjustedSpinePosition = currentNavigationPositionSubject$.value
    const offsetInSpineItem = 0

    if (settings.settings.computedPageTurnMode === `scrollable`) {
      adjustedSpinePosition = scrollViewportNavigator.getNavigationForPosition(getCurrentViewportPosition())
    } else if (lastUserExpectedNavigation?.type === `navigate-from-cfi`) {
      /**
       * When `navigate-from-cfi` we always try to retrieve offset from cfi node and navigate
       * to there
       */
      adjustedSpinePosition = navigator.getNavigationForCfi(lastUserExpectedNavigation.data)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-cfi`, `use last cfi`)
    } else if (lastUserExpectedNavigation?.type === `navigate-from-next-item`) {
      /**
       * When `navigate-from-next-item` we always try to get the offset of the last page, that way
       * we ensure reader is always redirected to last page
       */
      adjustedSpinePosition = navigator.getNavigationForLastPage(spineItem)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-next-item`, {})
    } else if (lastUserExpectedNavigation?.type === `navigate-from-previous-item`) {
      /**
       * When `navigate-from-previous-item'`
       * we always try stay on the first page of the item
       */
      adjustedSpinePosition = navigator.getNavigationForPage(0, spineItem)
      Report.log(NAMESPACE, `adjustNavigation`, `navigate-from-previous-item`, {})
    } else if (lastUserExpectedNavigation?.type === `navigate-from-anchor`) {
      /**
       * When `navigate-from-anchor` we just stay on the current reading item and try to get
       * the offset of that anchor.
       */
      const anchor = lastUserExpectedNavigation.data
      adjustedSpinePosition = navigator.getNavigationForAnchor(anchor, spineItem)
    } else if (lastCfi) {
      // @todo, ignore cfi if the current focus item
      /**
       * When there is no last navigation then we first look for any existing CFI. If there is a cfi we try to retrieve
       * the offset and navigate the user to it
       * @todo handle vertical writing, we are always redirected to page 1 currently
       */
      adjustedSpinePosition = navigator.getNavigationForCfi(lastCfi)
      Report.log(NAMESPACE, `adjustNavigation`, `use last cfi`)
    } else {
      // @todo we should get the page index of the focused item, if focus item is not inside pagination then go to spine index
      /**
       * Last resort case, there is no CFI so we check the current page and try to navigate to the closest one
       */
      // @todo get x of first visible element and try to get the page for this element
      // using the last page is not accurate since we could have less pages
      const currentPageIndex = pagination.getPaginationInfo().beginPageIndexInSpineItem || 0
      adjustedSpinePosition = navigator.getNavigationForPage(currentPageIndex, spineItem)
      Report.log(NAMESPACE, `adjustNavigation`, `use guess strategy`, {})
    }

    const areDifferent = navigator.arePositionsDifferent(adjustedSpinePosition, currentNavigationPositionSubject$.value)

    Report.log(NAMESPACE, `adjustNavigation`, {
      areDifferent,
      offsetInSpineItem,
      expectedSpineOffset: adjustedSpinePosition,
      currentNavigationPosition: currentNavigationPositionSubject$.value,
      lastUserExpectedNavigation,
    })

    if (areDifferent) {
      adjustNavigationSubject$.next({
        position: adjustedSpinePosition,
        animate: false,
      })
    }

    return of({
      previousNavigationPosition: currentNavigationPositionSubject$.value,
      adjustedSpinePosition,
      areDifferent,
    })
  }

  layoutSubject$.subscribe(() => {
    currentViewportPositionMemoUnused = undefined
  })

  /**
   * Watch for settings update that require changes
   * on this layer.
   *
   * @important
   * Try not to have duplicate with other lower components that also listen to settings change and re-layout
   * on the same settings.
   */
  const layoutChangeSettings$ = settings.settings$.pipe(
    mapKeysTo([`computedPageTurnDirection`, `computedPageTurnMode`, `numberOfAdjacentSpineItemToPreLoad`]),
    distinctUntilChanged(isShallowEqual),
    skip(1),
  )

  const layout$ = merge(layoutSubject$, layoutChangeSettings$).pipe(
    withLatestFrom(element$),
    tap(([, element]) => {
      if (settings.settings.computedPageTurnMode === `scrollable`) {
        element.style.removeProperty(`transform`)
        element.style.removeProperty(`transition`)
        element.style.overflow = `scroll`
      } else {
        element.style.removeProperty(`overflow`)
        element.style.removeProperty(`overflowY`)
      }

      spineItemManager.layout()
    }),
  )

  layout$.subscribe()

  const navigation$: Observable<Navigation> = merge(
    panViewportNavigator.$.navigation$.pipe(
      map((event) => ({
        ...event,
        position: { x: event.x, y: event.y, spineItem: event.spineItem },
        animation: `snap` as const,
        triggeredBy: `manual` as const,
      })),
    ),
    manualViewportNavigator.$.navigation$.pipe(
      map((event) => ({
        ...event,
        position: { x: event.x, y: event.y, spineItem: event.spineItem },
        animation: event.animate ? (`turn` as const) : (false as const),
        triggeredBy: `manual` as const,
      })),
    ),
    adjustNavigationSubject$.pipe(
      map((event) => ({
        ...event,
        triggeredBy: `adjust` as const,
        animation: event.animate ? (`turn` as const) : (false as const),
      })),
    ),
    scrollViewportNavigator.$.navigation$.pipe(
      map((event) => ({
        ...event,
        triggeredBy: `scroll` as const,
        animation: event.animate ? (`turn` as const) : (false as const),
      })),
    ),
  ).pipe(
    map((event) => {
      if (`lastUserExpectedNavigation` in event) {
        lastUserExpectedNavigation = event.lastUserExpectedNavigation
      }

      currentNavigationPositionSubject$.next(event.position)

      return { ...event, lastUserExpectedNavigation }
    }),
    share(),
    takeUntil(context.destroy$),
  )

  /**
   * Typically all manual navigation (user turn, user end of pan, etc).
   * We try to filter out all navigation that are asynchronous such as scrolling.
   * This is because we do not want to trigger adjust for them since they already adjust
   * the viewport on their own.
   */
  const navigationWhichRequireManualAdjust$ = navigation$.pipe(
    filter(({ triggeredBy }) => {
      if (
        triggeredBy === `scroll` ||
        (settings.settings.computedPageTurnMode === `scrollable` && triggeredBy === `adjust`)
      ) {
        return false
      } else {
        return true
      }
    }),
  )

  const manualAdjust$ = merge(
    panViewportNavigator.$.moveToSubject$
      .asObservable()
      .pipe(map((event) => ({ ...event, animation: false as const }))),
    navigationWhichRequireManualAdjust$,
  ).pipe(
    map(({ animation, position }) => {
      const shouldAnimate = !(
        !animation ||
        (animation === `turn` && settings.settings.computedPageTurnAnimation === `none`)
      )

      return {
        type: `manualAdjust` as const,
        shouldAnimate,
        animation,
        position,
      }
    }),
    share(),
  )

  const processManualAdjust$ = merge(manualAdjust$).pipe(
    startWith(undefined),
    pairwise(),
    tap(([prevEvent, currentEvent]) => {
      // cleanup potential previous manual adjust
      if (prevEvent?.type === `manualAdjust` && currentEvent?.type !== `manualAdjust`) {
        element$.getValue().style.setProperty(`transition`, `none`)
        element$.getValue().style.setProperty(`opacity`, `1`)
      }
    }),
    switchMap(([, currentEvent]) => {
      if (currentEvent?.type !== `manualAdjust`) return EMPTY

      const animationDuration =
        currentEvent.animation === `snap`
          ? settings.settings.computedSnapAnimationDuration
          : settings.settings.computedPageTurnAnimationDuration
      const pageTurnAnimation =
        currentEvent.animation === `snap` ? (`slide` as const) : settings.settings.computedPageTurnAnimation

      return of(currentEvent).pipe(
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
          const noAdjustmentNeeded = false

          if (data.shouldAnimate && !noAdjustmentNeeded) {
            if (pageTurnAnimation === `fade`) {
              element$.getValue().style.setProperty(`transition`, `opacity ${animationDuration / 2}ms`)
              element$.getValue().style.setProperty(`opacity`, `0`)
            } else if (currentEvent.animation === `snap` || pageTurnAnimation === `slide`) {
              element$.getValue().style.setProperty(`transition`, `transform ${animationDuration}ms`)
              element$.getValue().style.setProperty(`opacity`, `1`)
            }
          } else {
            element$.getValue().style.setProperty(`transition`, `none`)
            element$.getValue().style.setProperty(`opacity`, `1`)
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
          if (pageTurnAnimation !== `fade`) {
            adjustReadingOffset(data.position)
          }
        }),
        currentEvent.shouldAnimate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
        tap((data) => {
          if (pageTurnAnimation === `fade`) {
            adjustReadingOffset(data.position)
            element$.getValue().style.setProperty(`opacity`, `1`)
          }
        }),
        currentEvent.shouldAnimate ? delay(animationDuration / 2, animationFrameScheduler) : identity,
        tap((data) => {
          if (pageTurnAnimation === `fade`) {
            adjustReadingOffset(data.position)
          }
        }),
        takeUntil(
          viewportNavigatorsSharedState$.pipe(
            filter((state) => state === `start`),
            skip(1),
          ),
        ),
      )
    }),
    share(),
    takeUntil(context.destroy$),
  )

  /**
   * Observe the state of adjustment.
   * This is used to know whether the viewport is being adjusted by whatever means.
   */
  const adjustmentState$ = merge(
    merge(manualAdjust$).pipe(map(() => `start` as const)),
    merge(processManualAdjust$).pipe(map(() => `end` as const)),
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
  const state$ = combineLatest([...viewportNavigators.map(({ $: { state$ } }) => state$), adjustmentState$]).pipe(
    map((states) => (states.every((state) => state === `end`) ? `free` : `busy`)),
    distinctUntilChanged(),
    shareReplay(1),
    /**
     * @important
     * Since state$ is being updated from navigation$ and other exported streams we need it to be
     * hot so it always have the correct value no matter when someone subscribe later.
     * We cannot wait for the cold stream to start after a navigation already happened for example.
     */
    makeItHot,
  )

  const waitForViewportFree$ = state$.pipe(
    filter((v) => v === `free`),
    take(1),
  )

  /**
   * Use cases covered by this observer
   * - Layout changed for items
   *  - viewport is free
   *    - we adjust the navigation
   *    - we update the pagination
   *  - viewport is busy (ongoing navigation, animation, etc)
   *    - we wait for viewport free
   *    - we adjust pagination
   *    - we update pagination
   *
   * Once navigation is adjusted we update the pagination regardless if the
   * adjustment was needed or not. This is because the layout may have change. In some case, the content
   * may have changed but by change the viewport position is still the same. It does not mean the actual content
   * is the same.
   *
   * @important
   * Adjustment and pagination update are cancelled as soon as another navigation happens. (it will already be handled there).
   * adjustNavigation$ can trigger a navigation if adjustment is needed which will in term cancel the inner stream.
   *
   * @todo
   * Right now we react to literally every layout and some time we might not need to update pagination (ex pre-paginated element got unload).
   * Maybe we should only listen to current items visible only ?
   */
  const navigationAdjustedAfterLayout$ = spine.$.layout$.pipe(
    /**
     * @important
     * Careful with using debounce / throttle here since it can decrease user experience
     * when layout happens it can means an item before the current one has been unloaded, at current code
     * we unload and size back each item to the screen so it will have the effect of flicker for user.
     * Consider this workflow:
     * - user navigate to page 2
     * - viewport move to item 2
     * - page 1 unload and goes back from 2000px to 500px
     * - layout triggered
     * - viewport is now on an item far after item 2 because item 1 shrink (PROBLEM)
     * - sometime after viewport is adjusted back to item 2.
     *
     * Two solution to fix this issue:
     * - maybe later try to implement a different strategy and never shrink back item unless they are loaded
     * - do not use debounce / throttle and navigate back to the item right on the same tick
     */
    // debounceTime(10, animationFrameScheduler),
    switchMap(() =>
      waitForViewportFree$.pipe(
        switchMap(() => {
          const focusedSpineItem = spineItemManager.getFocusedSpineItem()

          if (!focusedSpineItem) return EMPTY

          return adjustNavigation(focusedSpineItem)
        }),
        takeUntil(navigation$),
      ),
    ),
    share(),
  )

  const parentElementSub = parentElement$
    .pipe(filter(isDefined), withLatestFrom(spine.element$))
    .subscribe(([parentElement, spineElement]) => {
      const element = createElement(parentElement.ownerDocument, hookManager)
      element.appendChild(spineElement)
      parentElement.appendChild(element)
      element$.next(element)
    })

  const destroy = () => {
    layoutSubject$.complete()
    adjustNavigationSubject$.complete()
    currentNavigationPositionSubject$.complete()
    parentElementSub.unsubscribe()
    viewportNavigators.forEach((navigator) => navigator.destroy())
  }

  return {
    destroy,
    layout: () => layoutSubject$.next(),
    getCurrentNavigationPosition: () => currentNavigationPositionSubject$.value,
    getCurrentViewportPosition,
    turnLeft: manualViewportNavigator.turnLeft,
    turnRight: manualViewportNavigator.turnRight,
    goToPage: manualViewportNavigator.goToPage,
    goToSpineItem: manualViewportNavigator.goToSpineItem,
    goToUrl: manualViewportNavigator.goToUrl,
    goToCfi: manualViewportNavigator.goToCfi,
    goToPageOfCurrentChapter: manualViewportNavigator.goToPageOfCurrentChapter,
    moveTo: panViewportNavigator.moveTo,
    getLastUserExpectedNavigation: () => lastUserExpectedNavigation,
    element$,
    getElement: () => element$.getValue(),
    $: {
      state$,
      navigation$,
      navigationAdjustedAfterLayout$,
      currentNavigationPosition$: currentNavigationPositionSubject$.asObservable(),
    },
  }
}

const createElement = (doc: Document, hookManager: HookManager) => {
  const element: HTMLElement = doc.createElement(`div`)
  element.style.cssText = `
    height: 100%;
    position: relative;
  `
  element.className = `${HTML_PREFIX}-viewport-navigator`

  /**
   * Beware of this property, do not try to change anything else or remove it.
   * This is early forced optimization and is used for this specific context.
   * @see https://developer.mozilla.org/en-US/docs/Web/CSS/will-change
   *
   * @important
   * This seems to be responsible for the screen freeze issue
   */
  // element.style.willChange = `transform`
  // element.style.transformOrigin = `0 0`

  hookManager.execute("viewportNavigator.onBeforeContainerCreated", undefined, { element })

  return element
}

export type ViewportNavigator = ReturnType<typeof createViewportNavigator>
