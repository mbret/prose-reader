import {
  animationFrameScheduler,
  defer,
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
import type { UserNavigationEntry } from "../../../navigation/types"
import type { Reader } from "../../../reader"
import { DestroyableClass } from "../../../utils/DestroyableClass"

/** How long after its last scroll event a scroll of the user's is over. */
const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500

export class UserScrollNavigation extends DestroyableClass {
  /**
   * The navigations that follow the user's scrolling. The scroll makes one at
   * each move, one as a layout starts during it, and one when it is over,
   * unless another navigation ended it. With one at each move, a page turn
   * made during the scroll starts from where the scroll has taken the book.
   * They only update the navigation: the element is already where the user
   * scrolled it. The lock is held from the first move of a scroll until it is
   * over.
   */
  public readonly navigation$: Observable<UserNavigationEntry>

  constructor(protected reader: Reader) {
    super()

    const { scrollNavigationController } = this.reader.navigation
    const { spine } = this.reader

    /**
     * A navigation that something other than the scroll asks for, as a link,
     * a bookmark or a page turn does. The reader has handled the request by
     * then.
     */
    const navigationRequestedByOtherThanScroll$ =
      this.reader.navigation.navigationRequest$.pipe(
        filter(({ type }) => type !== "scroll"),
      )

    const scrollPositionToNavigateTo$ =
      scrollNavigationController.scrollNotMadeByReader$.pipe(
        exhaustMap((scrollPositionOfFirstMove) =>
          defer(() => {
            const unlock = this.reader.navigation.lock()

            const scrollPositionOfEachMove$ = merge(
              of(scrollPositionOfFirstMove),
              scrollNavigationController.scrollNotMadeByReader$,
            )

            /**
             * A browser reports a move a frame or more after it happens, so
             * the element can be further than the navigation of the last
             * move. A layout that starts then can move the spine items, and
             * the restoration that follows it works from the navigation. So
             * as the layout starts, before it moves the first item, the
             * reader navigates to where the element is: the restoration then
             * scrolls the book to that place again.
             *
             * Only the first start since the scroll began, or since the items
             * were last laid out, counts. By a later one, as after the
             * viewport lost its size or a newer request cancelled the pass,
             * some items have moved already.
             */
            const scrollPositionAsLayoutStarts$ = spine.itemsLayout$.pipe(
              startWith(undefined),
              switchMap(() => spine.itemsLayoutStart$.pipe(first())),
              map(() => scrollNavigationController.scrollPosition),
            )

            const scrollPositionAtEndOfScroll$ = scrollPositionOfEachMove$.pipe(
              switchMap((scrollPositionOfLastMove) =>
                merge(
                  /**
                   * The scroll is over once nothing has moved for a while:
                   * the user is where the element is by then.
                   */
                  timer(
                    SCROLL_FINISHED_DEBOUNCE_TIMEOUT,
                    animationFrameScheduler,
                  ).pipe(map(() => scrollNavigationController.scrollPosition)),
                  /**
                   * It is over at once when the book no longer scrolls, as
                   * after a change of page turn mode. The element has lost
                   * its box, and its offsets with it: the user is where the
                   * reader last knew the element. That is where the last move
                   * took it, or where the reader scrolled it since, as it
                   * does to keep the book on the same place through a layout.
                   */
                  scrollNavigationController.isActive$.pipe(
                    filter((isActive) => !isActive),
                    withLatestFrom(
                      scrollNavigationController.scrollPositionKnownToReader$.pipe(
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
              merge(
                scrollPositionOfEachMove$,
                scrollPositionAsLayoutStarts$,
              ).pipe(
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
          }).pipe(
            /**
             * The scroll is also over when something else asks for a
             * navigation: the reader goes there, no longer where the user
             * scrolled. The scroll then makes no more navigations. One to
             * where the element is would replace the other navigation and its
             * target.
             *
             * It follows the requests from before it takes the lock, so that
             * a request made as the lock is taken ends it too.
             */
            takeUntil(navigationRequestedByOtherThanScroll$),
          ),
        ),
      )

    this.navigation$ = scrollPositionToNavigateTo$.pipe(
      map(
        (scrollPosition): UserNavigationEntry => ({
          animation: false,
          type: "scroll",
          target: {
            type: "position",
            value:
              scrollNavigationController.fromScrollPosition(scrollPosition),
          },
        }),
      ),
      takeUntil(this.destroy$),
      share(),
    )
  }
}
