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
     * One anchor per entry: the page its navigation settled on. A fresh
     * navigation onto the same page is a new entry and gets its own. A
     * restoration keeps the entry, so the page it lands on does not move the
     * anchor: anchoring the restored page's own first character would restore
     * to the page before it at the next relayout, and every round trip through
     * a resize would walk the reader backwards.
     */
    distinctUntilChanged(
      ([, previousNavigation], [, navigation]) =>
        previousNavigation.id === navigation.id,
    ),
    map(
      ([pagination, navigation]): InternalNavigationEntry => ({
        ...navigation,
        paginationBeginCfi: pagination.begin.positions.cfi,
        meta: { triggeredBy: "pagination" },
      }),
    ),
  )
