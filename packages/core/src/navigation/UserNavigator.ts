import {
  NEVER,
  Observable,
  Subject,
  animationFrameScheduler,
  debounceTime,
  exhaustMap,
  filter,
  finalize,
  first,
  fromEvent,
  map,
  merge,
  of,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from "rxjs"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { ViewportPosition } from "./viewport/ViewportNavigator"
import { Context } from "../context/Context"
import { Report } from "../report"
import { DestroyableClass } from "../utils/DestroyableClass"
import { Locker } from "./Locker"
import { getScaledDownPosition } from "./viewport/getScaledDownPosition"
import { Spine } from "../spine/Spine"

const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500
const NAMESPACE = `navigation/UserNavigator`

const report = Report.namespace(NAMESPACE)

export type UserNavigationEntry = {
  position?: ViewportPosition
  spineItem?: number | string
  url?: string | URL
  cfi?: string
  animation?: boolean | "turn" | "snap"
  type?: "api" | "scroll"
  /**
   * Useful to be specified when navigating with pan
   * and where a couple of px can go backward for the
   * last navigation (finger release)
   */
  direction?: "left" | "right" | "top" | "bottom"
}

export class UserNavigator extends DestroyableClass {
  /**
   * Navigation from external API.
   *
   * This is the navigation used by navigators and is not necessarily valie.
   * We need to verify and adjust the correct navigation afterward
   */
  protected navigationSubject = new Subject<UserNavigationEntry>()

  public locker = new Locker()

  public navigation$ = this.navigationSubject.asObservable()

  constructor(
    protected settings: ReaderSettingsManager,
    protected element$: Observable<HTMLElement>,
    protected context: Context,
    protected scrollHappeningFromBrowser$: Observable<unknown>,
    protected spine: Spine,
  ) {
    super()

    const userScroll$ = element$.pipe(
      switchMap((element) =>
        settings.watch(["computedPageTurnMode"]).pipe(
          switchMap(({ computedPageTurnMode }) =>
            computedPageTurnMode === "controlled"
              ? NEVER
              : fromEvent(element, `scroll`).pipe(
                  withLatestFrom(scrollHappeningFromBrowser$),
                  filter(
                    ([, shouldAvoidScrollEvent]) => !shouldAvoidScrollEvent,
                  ),
                  map(([event]) => event),
                ),
          ),
        ),
      ),
      share(),
    )

    /**
     * Update the navigation as the user scroll.
     *
     * Keep it synchronized with scrolling. This should
     * not trigger viewport navigation, only update internal navigation.
     */
    const navigateOnScroll$ = userScroll$.pipe(
      exhaustMap((event) => {
        const unlock = this.locker.lock()

        return merge(userScroll$, of(event)).pipe(
          debounceTime(
            SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
            animationFrameScheduler,
          ),
          first(),
          tap(() => {
            const targetElement = event.target as HTMLElement

            /**
             * Make sure to scale position to stay agnostic to potential zoom
             */
            const scaledDownPosition = getScaledDownPosition({
              element: targetElement,
              position: {
                x: targetElement.scrollLeft ?? 0,
                y: targetElement.scrollTop ?? 0,
              },
              spineElement: this.spine.element,
            })

            this.navigate({
              animation: false,
              type: "scroll",
              position: scaledDownPosition,
            })
          }),
          finalize(() => {
            unlock()
          }),
        )
      }),
    )

    merge(navigateOnScroll$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  /**
   * Remember that this navigation is not trustable.
   *
   * It needs to be verified and adjusted if necessary before becoming internal.
   */
  navigate(to: UserNavigationEntry) {
    report.info(`.navigate`, to)

    this.navigationSubject.next(to)
  }
}
