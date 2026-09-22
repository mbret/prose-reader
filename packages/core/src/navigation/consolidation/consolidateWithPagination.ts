import {
  distinctUntilChanged,
  filter,
  map,
  type Observable,
  withLatestFrom,
} from "rxjs"
import type { Context } from "../../context/Context"
import type { InternalNavigationEntry } from "../types"

/**
 * Anchors the navigation on the page being read, so restoration can return
 * to it. Only a settled result qualifies: a provisional one stands in with the
 * item start, and anchoring on that would restore the reader to the top of the
 * item.
 *
 * The anchor is written as a new entry, but it is not a navigation. It keeps
 * the entry's position and request, which is what keeps it out of
 * `navigation$` and away from every consumer that would treat it as one.
 */
export const consolidateWithPagination = (
  context: Context,
  navigation$: Observable<InternalNavigationEntry>,
) =>
  context.bridgeEvent.pagination$.pipe(
    filter((pagination) => pagination.isSettled),
    withLatestFrom(navigation$),
    /**
     * Per entry, not per cfi: a fresh navigation that lands on the same page
     * still needs its own anchor.
     */
    distinctUntilChanged(
      ([previousPagination, previousNavigation], [pagination, navigation]) =>
        previousNavigation.id === navigation.id &&
        previousPagination.begin.cfi === pagination.begin.cfi,
    ),
    map(
      ([pagination, navigation]): InternalNavigationEntry => ({
        ...navigation,
        paginationBeginCfi: pagination.begin.cfi,
        meta: { triggeredBy: "pagination" },
      }),
    ),
  )
