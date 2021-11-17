import { animationFrameScheduler, BehaviorSubject, EMPTY, fromEvent, iif, merge, MonoTypeOperatorFunction, Observable, of } from "rxjs"
import { debounceTime, distinctUntilChanged, filter, map, share, switchMap, takeUntil, withLatestFrom, startWith, tap } from "rxjs/operators"
import { Context } from "../../context"
import { createNavigationResolver, ViewportNavigationEntry } from "../navigationResolver"

const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 200

export const createScrollViewportNavigator = ({ context, element, navigator, currentNavigationSubject$ }: {
  context: Context,
  element: HTMLElement,
  navigator: ReturnType<typeof createNavigationResolver>,
  currentNavigationSubject$: BehaviorSubject<ViewportNavigationEntry>
}) => {
  let lastScrollWasProgrammaticallyTriggered = false

  const onlyUserScrollFilter = <T>(source: Observable<T>): Observable<T> =>
    source.pipe(filter(() => {
      if (lastScrollWasProgrammaticallyTriggered) {
        lastScrollWasProgrammaticallyTriggered = false
        return false
      }

      return true
    }))

  const adjustReadingOffset = ({ x, y }: { x: number, y: number }) => {
    if (context.getSettings().computedPageTurnMode === `scrollable`) {
      lastScrollWasProgrammaticallyTriggered = true
      element.scrollTo({ left: x, top: y })

      return true
    }

    return false
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
      onlyUserScrollFilter,
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

  const userScrollEnd$ = userScroll$
    .pipe(
      debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT, animationFrameScheduler),
      share(),
      takeUntil(context.$.destroy$)
    )

  const state$ = merge(
    userScroll$
      .pipe(
        map(() => `start` as const),
        distinctUntilChanged()
      ),
    userScrollEnd$
      .pipe(
        map(() => `end` as const)
      )
  )
    .pipe(
      startWith(`end`)
    )

  return {
    destroy: () => { },
    adjustReadingOffset,
    $: {
      state$,
      navigation$: navigationOnScroll$
    }
  }
}
