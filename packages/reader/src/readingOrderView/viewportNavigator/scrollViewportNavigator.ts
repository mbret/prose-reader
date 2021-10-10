import { animationFrameScheduler, BehaviorSubject, EMPTY, fromEvent, iif, Observable, of } from "rxjs"
import { debounceTime, distinctUntilChanged, filter, map, share, switchMap, takeUntil, withLatestFrom } from "rxjs/operators"
import { Context } from "../../context"
import { createNavigationResolver, ViewportNavigationEntry } from "../navigationResolver"

export const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 200

export const createScrollViewportNavigator = ({ context, element, navigator, currentNavigationSubject$ }: {
  context: Context,
  element: HTMLElement,
  navigator: ReturnType<typeof createNavigationResolver>,
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>
}) => {
  let lastScrollWasProgrammaticallyTriggered = false

  const adjustReadingOffset = ({ x, y }: { x: number, y: number }) => {
    lastScrollWasProgrammaticallyTriggered = true
    element.scrollTo({ left: x, top: y })
  }

  const runOnFreePageTurnModeOnly$ = <T>(source: Observable<T>) => context.$.settings$
    .pipe(
      map(() => context.getSettings().computedPageTurnMode),
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
      takeUntil(context.$.destroy$)
    )

  const navigationOnScroll$ = userScroll$
    .pipe(
      debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
      withLatestFrom(currentNavigationSubject$),
      switchMap(() => {
        const navigation = navigator.getMostPredominantNavigationForPosition({ x: element.scrollLeft, y: element.scrollTop })
        /**
         * Because scroll navigation is always different: we can scroll through the same item but at different progress
         * we always return something from the observable. So for example if we have only one long height item (webtoon)
         * we are able to update the general progress
         */
        return of({ position: navigation, animate: false, lastUserExpectedNavigation: undefined })
      }),
      share()
    )

  return {
    adjustReadingOffset,
    $: {
      userScroll$,
      navigationOnScroll$
    }
  }
}
