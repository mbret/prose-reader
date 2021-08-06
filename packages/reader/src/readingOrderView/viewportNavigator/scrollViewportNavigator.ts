import { animationFrameScheduler, BehaviorSubject, EMPTY, fromEvent, iif, Observable, of } from "rxjs"
import { debounceTime, distinctUntilChanged, filter, map, share, switchMap, takeUntil, withLatestFrom } from "rxjs/operators"
import { Context } from "../../context"
import { Report } from "../../report"
import { createNavigator, ViewportNavigationEntry } from "../navigator"

export const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 200

export const createScrollViewportNavigator = ({ context, element, navigator, currentNavigationSubject$ }: {
  context: Context,
  element: HTMLElement,
  navigator: ReturnType<typeof createNavigator>,
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>
}) => {
  let lastScrollWasProgrammaticallyTriggered = false

  const adjustReadingOffset = ({ x, y }: { x: number, y: number }) => {
    lastScrollWasProgrammaticallyTriggered = true
    element.scrollTo({ left: x, top: y })
  }

  const runOnFreePageTurnModeOnly$ = <T>(source: Observable<T>) => context.$.settings$
    .pipe(
      map(() => context.getComputedPageTurnMode()),
      distinctUntilChanged(),
      switchMap((mode) =>
        iif(() => mode === `controlled`, EMPTY, source)
      )
    )

  const userScroll$ = runOnFreePageTurnModeOnly$(fromEvent(element, `scroll`))
    .pipe(
      filter(() => {
        if (lastScrollWasProgrammaticallyTriggered) {
          lastScrollWasProgrammaticallyTriggered = false
          return false
        }

        return true
      }),
      share(),
      takeUntil(context.$.destroy$),
    )

  const navigationOnScroll$ = userScroll$
    .pipe(
      debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
      withLatestFrom(currentNavigationSubject$),
      switchMap(([, currentNavigation]) => {
        const navigation = { x: element.scrollLeft, y: element.scrollTop }
        const pageTurnDirection = context.getSettings().pageTurnDirection
        // @todo movingForward does not work same with free-scroll, try to find a reliable way to detect
        // const movingForward = navigator.isNavigationGoingForwardFrom(navigation, currentNavigationPosition)
        // const triggerPercentage = movingForward ? 0.7 : 0.3
        const triggerPercentage = 0.5
        const triggerXPosition = pageTurnDirection === `horizontal`
          ? navigation.x + (context.getVisibleAreaRect().width * triggerPercentage)
          : 0
        const triggerYPosition = pageTurnDirection === `horizontal`
          ? 0
          : navigation.y + (context.getVisibleAreaRect().height * triggerPercentage)
        const midScreenPositionSafePosition = navigator.wrapPositionWithSafeEdge({ x: triggerXPosition, y: triggerYPosition })
        const finalNavigation = navigator.getNavigationForPosition(midScreenPositionSafePosition)

        if (navigator.areNavigationDifferent(finalNavigation, currentNavigation)) {
          return of({ position: finalNavigation, animate: false, lastUserExpectedNavigation: undefined })
        }

        return EMPTY
      }),
      share(),
      takeUntil(context.$.destroy$),
    )

  return {
    adjustReadingOffset,
    $: {
      userScroll$,
      navigationOnScroll$
    }
  }
}