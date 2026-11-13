import {
  animationFrameScheduler,
  exhaustMap,
  filter,
  finalize,
  first,
  map,
  merge,
  type Observable,
  of,
  share,
  startWith,
  switchMap,
  takeUntil,
  takeWhile,
  timer,
  withLatestFrom,
} from "rxjs"
import type { ScrollNavigationController } from "../../../navigation/controllers/ScrollNavigationController"
import type { UserNavigationEntry } from "../../../navigation/types"
import type { Spine } from "../../../spine/Spine"
import { DestroyableClass } from "../../../utils/DestroyableClass"

/** How long after its last scroll event a scroll of the user's is over. */
const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500

export class UserScrollNavigation extends DestroyableClass {
  /**
   * The navigations that follow the user's scrolling. They only update the
   * navigation: the element is already where the user scrolled it. The lock
   * is held from the first move of a scroll until it is over.
   */
  public readonly navigation$: Observable<UserNavigationEntry>

  constructor(
    protected scrollNavigationController: ScrollNavigationController,
    protected lock: () => () => void,
    protected spine: Spine,
  ) {
    super()

    const scrollPositionToNavigateTo$ =
      this.scrollNavigationController.scrollNotMadeByReader$.pipe(
        exhaustMap((scrollPositionOfFirstMove) => {
          const unlock = this.lock()

          /**
           * Until the scroll is over, the navigation is from before it. A
           * layout that starts meanwhile can move the spine items, and the
           * restoration that follows it works from the navigation. So as the
           * layout starts, before it moves the first item, the reader
           * navigates to where the element is: the restoration then scrolls
           * the book to that place again. The element is read rather than the
           * last move, since a browser reports a move a frame or more after
           * it happens.
           *
           * Only the first start since the scroll began, or since the items
           * were last laid out, counts. By a later one, as after the viewport
           * lost its size or a newer request cancelled the pass, some items
           * have moved already.
           */
          const scrollPositionAsLayoutStarts$ = this.spine.itemsLayout$.pipe(
            startWith(undefined),
            switchMap(() => this.spine.itemsLayoutStart$.pipe(first())),
            map(() => this.scrollNavigationController.scrollPosition),
          )

          const scrollPositionAtEndOfScroll$ = merge(
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
                 * or where the reader scrolled it since, as it does to keep
                 * the book on the same place through a layout.
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
          )

          return merge(
            scrollPositionAsLayoutStarts$.pipe(
              map((scrollPosition) => ({
                scrollPosition,
                isEndOfScroll: false,
              })),
            ),
            scrollPositionAtEndOfScroll$.pipe(
              map((scrollPosition) => ({
                scrollPosition,
                isEndOfScroll: true,
              })),
            ),
          ).pipe(
            takeWhile(({ isEndOfScroll }) => !isEndOfScroll, true),
            map(({ scrollPosition }) => scrollPosition),
            finalize(() => {
              unlock()
            }),
          )
        }),
      )

    this.navigation$ = scrollPositionToNavigateTo$.pipe(
      map(
        (scrollPosition): UserNavigationEntry => ({
          animation: false,
          type: "scroll",
          target: {
            type: "position",
            value:
              this.scrollNavigationController.fromScrollPosition(
                scrollPosition,
              ),
          },
        }),
      ),
      takeUntil(this.destroy$),
      share(),
    )
  }
}
