import {
  Subject,
  animationFrameScheduler,
  debounceTime,
  exhaustMap,
  finalize,
  first,
  merge,
  of,
  takeUntil,
  tap,
} from "rxjs"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Spine } from "../spine/Spine"
import { UnsafeSpinePosition } from "../spine/types"
import { DestroyableClass } from "../utils/DestroyableClass"
import type { Viewport } from "../viewport/Viewport"
import type { Locker } from "./Locker"
import type { ScrollNavigationController } from "./controllers/ScrollNavigationController"
import type { UserNavigationEntry } from "./types"

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
    protected settings: ReaderSettingsManager,
    protected context: Context,
    protected spine: Spine,
    protected scrollNavigationController: ScrollNavigationController,
    protected locker: Locker,
    viewport: Viewport,
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
            const targetElement = event.target as HTMLElement

            const spinePosition = new UnsafeSpinePosition({
              x: targetElement.scrollLeft / viewport.scaleFactor,
              y: targetElement.scrollTop / viewport.scaleFactor,
            })

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
