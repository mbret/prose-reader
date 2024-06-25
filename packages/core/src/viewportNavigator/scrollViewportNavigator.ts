import { animationFrameScheduler, BehaviorSubject, EMPTY, fromEvent, iif, merge, Observable, of } from "rxjs"
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  share,
  switchMap,
  takeUntil,
  withLatestFrom,
  startWith,
} from "rxjs/operators"
import { Context } from "../context/Context"
import { Spine } from "../spine/createSpine"
import { createNavigationResolver, ViewportNavigationEntry } from "../spine/navigationResolver"
import { SpineItemManager } from "../spineItemManager"
import { ViewportPosition } from "../types"
import { getNewScaledOffset } from "../utils/layout"
import { isDefined } from "../utils/isDefined"
import { SettingsManager } from "../settings/SettingsManager"

const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 200

type ScaledDownPosition = ViewportPosition

export const createScrollViewportNavigator = ({
  context,
  element$,
  navigator,
  currentNavigationSubject$,
  settings,
  spine,
}: {
  context: Context
  settings: SettingsManager
  element$: BehaviorSubject<HTMLElement>
  navigator: ReturnType<typeof createNavigationResolver>
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>
  spine: Spine
  spineItemManager: SpineItemManager
}) => {
  let lastScrollWasProgrammaticallyTriggered = false

  const onlyUserScrollFilter = <T>(source: Observable<T>): Observable<T> =>
    source.pipe(
      filter(() => {
        if (lastScrollWasProgrammaticallyTriggered) {
          lastScrollWasProgrammaticallyTriggered = false
          return false
        }

        return true
      }),
    )

  const adjustReadingOffset = ({ x, y }: { x: number; y: number }) => {
    if (settings.settings.computedPageTurnMode === `scrollable`) {
      lastScrollWasProgrammaticallyTriggered = true
      element$.getValue()?.scrollTo({ left: x, top: y })

      return true
    }

    return false
  }

  const runOnFreePageTurnModeOnly$ = <T>(source: Observable<T>) =>
    settings.settings$.pipe(
      map(({ computedPageTurnMode }) => computedPageTurnMode),
      distinctUntilChanged(),
      switchMap((mode) => iif(() => mode === `controlled`, EMPTY, source)),
    )

  const userScroll$ = runOnFreePageTurnModeOnly$(
    element$.pipe(
      filter(isDefined),
      switchMap((element) => fromEvent(element, `scroll`)),
    ),
  ).pipe(onlyUserScrollFilter, share(), takeUntil(context.destroy$))

  const getScaledDownPosition = ({ x, y }: ViewportPosition) => {
    const spineElement = spine.getElement()

    if (!spineElement) throw new Error("Invalid spine element")

    const spineScaleX = spineElement.getBoundingClientRect().width / spineElement.offsetWidth

    /**
     * @important
     * we don't use pageSize but viewport clientWidth/height because on some browser (eg: firefox)
     * the scrollbar will take up content space, thus having a reduced pageSize. It will mess up calculation
     * otherwise
     */
    const scaledDownPosition = {
      x: getNewScaledOffset({
        newScale: 1,
        oldScale: spineScaleX,
        screenSize: element$.getValue()?.clientWidth ?? 0,
        pageSize: spineElement.scrollWidth,
        scrollOffset: x,
      }),
      y: getNewScaledOffset({
        newScale: 1,
        oldScale: spineScaleX,
        screenSize: element$.getValue()?.clientHeight ?? 0,
        pageSize: spineElement.scrollHeight,
        scrollOffset: y,
      }),
    }

    return scaledDownPosition
  }

  const getNavigationForPosition = (position: ScaledDownPosition) => {
    const navigation = navigator.getMostPredominantNavigationForPosition(position)

    return navigation
  }

  const getCurrentViewportPosition = () => {
    return getScaledDownPosition({ x: element$.getValue()?.scrollLeft ?? 0, y: element$.getValue()?.scrollTop ?? 0 })
  }

  const navigationOnScroll$ = userScroll$.pipe(
    debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
    withLatestFrom(currentNavigationSubject$),
    switchMap(() => {
      const navigation = getNavigationForPosition(
        getScaledDownPosition({ x: element$.getValue()?.scrollLeft ?? 0, y: element$.getValue()?.scrollTop ?? 0 }),
      )

      /**
       * Because scroll navigation is always different: we can scroll through the same item but at different progress
       * we always return something from the observable. So for example if we have only one long height item (webtoon)
       * we are able to update the general progress
       */
      return of({ position: navigation, animate: false, lastUserExpectedNavigation: undefined })
    }),
    share(),
  )

  const userScrollEnd$ = userScroll$.pipe(
    debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
    share(),
    takeUntil(context.destroy$),
  )

  const state$ = merge(
    userScroll$.pipe(
      map(() => `start` as const),
      distinctUntilChanged(),
    ),
    userScrollEnd$.pipe(map(() => `end` as const)),
  ).pipe(startWith(`end` as const))

  return {
    destroy: () => {
      // ...
    },
    adjustReadingOffset,
    getNavigationForPosition,
    getCurrentViewportPosition,
    $: {
      state$,
      navigation$: navigationOnScroll$,
    },
  }
}
