import {
  animationFrameScheduler,
  debounceTime,
  exhaustMap,
  filter,
  finalize,
  first,
  merge,
  of,
  Subject,
  takeUntil,
  tap,
} from "rxjs"
import type { ScrollNavigationController } from "../../../navigation/controllers/ScrollNavigationController"
import type { UserNavigationEntry } from "../../../navigation/types"
import { DestroyableClass } from "../../../utils/DestroyableClass"

/** How long after its last scroll event a scroll of the user's is over. */
export const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500

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
        exhaustMap((event) => {
          const unlock = this.lock()

          return merge(
            this.scrollNavigationController.scrollNotMadeByReader$,
            of(event),
          ).pipe(
            debounceTime(
              SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
              animationFrameScheduler,
            ),
            first(),
            tap(() => {
              const spinePosition =
                this.scrollNavigationController.fromScrollPosition(
                  this.scrollNavigationController.scrollPosition,
                )

              this.navigationSubject.next({
                animation: false,
                type: "scroll",
                target: { type: "position", value: spinePosition },
              })
            }),
            /**
             * The scroll ends at once when the book no longer scrolls, as
             * after a change of page turn mode: the element has lost its
             * box, and its offsets no longer say where the user is.
             */
            takeUntil(
              this.scrollNavigationController.isActive$.pipe(
                filter((isActive) => !isActive),
              ),
            ),
            finalize(() => {
              unlock()
            }),
          )
        }),
      )

    merge(navigateOnScroll$).pipe(takeUntil(this.destroy$)).subscribe()
  }
}
