import {
  animationFrameScheduler,
  debounceTime,
  exhaustMap,
  finalize,
  first,
  merge,
  of,
  Subject,
  takeUntil,
  tap,
} from "rxjs"
import type { ScrollNavigationController } from "../../../navigation/controllers/ScrollNavigationController"
import type { Locker } from "../../../navigation/Locker"
import type { UserNavigationEntry } from "../../../navigation/types"
import { DestroyableClass } from "../../../utils/DestroyableClass"

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
    protected locker: Locker,
  ) {
    super()

    /**
     * Update the navigation as the user scroll.
     *
     * Keep it synchronized with scrolling. This should
     * not trigger viewport navigation, only update internal navigation.
     */
    const navigateOnScroll$ = this.scrollNavigationController.userScroll$.pipe(
      exhaustMap((event) => {
        const unlock = this.locker.lock()

        return merge(
          this.scrollNavigationController.userScroll$,
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
              position: spinePosition,
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
