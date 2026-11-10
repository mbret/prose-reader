import {
  animationFrameScheduler,
  exhaustMap,
  filter,
  finalize,
  first,
  map,
  merge,
  of,
  Subject,
  startWith,
  switchMap,
  takeUntil,
  tap,
  timer,
  withLatestFrom,
} from "rxjs"
import type { ScrollNavigationController } from "../../../navigation/controllers/ScrollNavigationController"
import type { UserNavigationEntry } from "../../../navigation/types"
import { DestroyableClass } from "../../../utils/DestroyableClass"

/** How long after its last scroll event a scroll of the user's is over. */
const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500

export class UserScrollNavigation extends DestroyableClass {
  /**
   * Navigation from external API.
   *
   * This is the navigation used by navigators and is not necessarily valid.
   * We need to verify and adjust the correct navigation afterward
   */
  protected navigationSubject = new Subject<UserNavigationEntry>()

  public navigation$ = this.navigationSubject.asObservable()

  constructor(
    protected scrollNavigationController: ScrollNavigationController,
    protected lock: () => () => void,
  ) {
    super()

    /**
     * Update the navigation as the user scroll.
     *
     * Keep it synchronized with scrolling. This should
     * not trigger viewport navigation, only update internal navigation.
     */
    const navigateOnScroll$ =
      this.scrollNavigationController.scrollNotMadeByReader$.pipe(
        exhaustMap((scrollPositionOfFirstMove) => {
          const unlock = this.lock()

          return merge(
            of(scrollPositionOfFirstMove),
            this.scrollNavigationController.scrollNotMadeByReader$,
          ).pipe(
            switchMap((scrollPositionOfLastMove) =>
              merge(
                /**
                 * The scroll is over once nothing has moved for a while: the
                 * user is where the element is by then.
                 */
                timer(
                  SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
                  animationFrameScheduler,
                ).pipe(
                  map(() => this.scrollNavigationController.scrollPosition),
                ),
                /**
                 * It is over at once when the book no longer scrolls, as
                 * after a change of page turn mode. The element has lost its
                 * box, and its offsets with it: the user is where the reader
                 * last knew the element. That is where the last move took it,
                 * or where the reader scrolled it since, to keep the screen
                 * on the same place through a layout.
                 */
                this.scrollNavigationController.isActive$.pipe(
                  filter((isActive) => !isActive),
                  withLatestFrom(
                    this.scrollNavigationController.scrollPositionKnownToReader$.pipe(
                      startWith(scrollPositionOfLastMove),
                    ),
                  ),
                  map(
                    ([, scrollPositionKnownToReader]) =>
                      scrollPositionKnownToReader,
                  ),
                ),
              ),
            ),
            first(),
            tap((scrollPosition) => {
              this.navigationSubject.next({
                animation: false,
                type: "scroll",
                target: {
                  type: "position",
                  value:
                    this.scrollNavigationController.fromScrollPosition(
                      scrollPosition,
                    ),
                },
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
}
