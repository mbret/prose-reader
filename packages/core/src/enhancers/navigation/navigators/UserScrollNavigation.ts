import {
  concatWith,
  debounceTime,
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
} from "rxjs"
import type { UserNavigationEntry } from "../../../navigation/types"
import type { Reader } from "../../../reader"
import { DestroyableClass } from "../../../utils/DestroyableClass"

/** How long after its last move a scroll of the user's is over. */
const SCROLL_FINISHED_DEBOUNCE_TIMEOUT = 500

export class UserScrollNavigation extends DestroyableClass {
  /**
   * The navigations that follow the user's scrolling. The scroll makes one at
   * each move, one as a layout starts during it, and one when nothing has
   * moved for a while. With one at each move, a page turn made during the
   * scroll starts from where the scroll has taken the book. They only update
   * the navigation: the element is already where the user scrolled it. The
   * lock is held from the first move of a scroll until it is over.
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

            const nothingMovedForAWhile$ = scrollPositionOfEachMove$.pipe(
              debounceTime(SCROLL_FINISHED_DEBOUNCE_TIMEOUT),
            )

            /**
             * As after a change of page turn mode. The navigation is where
             * the scroll took the book, and the reader restores it once the
             * lock is released.
             */
            const bookNoLongerScrolls$ =
              scrollNavigationController.isActive$.pipe(
                filter((isActive) => !isActive),
              )

            return merge(
              // First, so that it hears of a layout that the navigation of
              // the first move starts.
              scrollPositionAsLayoutStarts$,
              scrollPositionOfEachMove$,
            ).pipe(
              takeUntil(nothingMovedForAWhile$),
              /**
               * The element can rest less than a pixel from its last move:
               * a scroll of less than a pixel is not told as a move. The
               * reader navigates to where the element rests, so that the
               * release of the lock finds the element where the navigation
               * is.
               */
              concatWith(
                defer(() => of(scrollNavigationController.scrollPosition)),
              ),
              takeUntil(bookNoLongerScrolls$),
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
