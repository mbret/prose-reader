import { isDefined } from "reactjrx"
import {
  NEVER,
  type Observable,
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
import type { Context } from "../context/Context"
import { Report } from "../report"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import { SpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import { Locker } from "./Locker"
import type { DeprecatedViewportPosition } from "./controllers/ControlledNavigationController"
import { getScaledDownPosition } from "./controllers/getScaledDownPosition"

const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500
const NAMESPACE = `navigation/UserNavigator`

const report = Report.namespace(NAMESPACE)

export type UserNavigationEntry = {
  position?: DeprecatedViewportPosition | SpinePosition
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
    protected scrollNavigatorElement$: Observable<HTMLElement | undefined>,
    protected context: Context,
    protected scrollHappeningFromBrowser$: Observable<unknown>,
    protected spine: Spine,
  ) {
    super()

    const userScroll$ = scrollNavigatorElement$.pipe(
      filter(isDefined),
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
              position: new SpinePosition({
                x: targetElement.scrollLeft ?? 0,
                y: targetElement.scrollTop ?? 0,
              }),
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
