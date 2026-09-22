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
 */
export const consolidateWithPagination = (
  context: Context,
  navigation$: Observable<InternalNavigationEntry>,
) =>
  context.bridgeEvent.pagination$.pipe(
    filter((pagination) => pagination.isSettled),
    withLatestFrom(navigation$),
    map(([pagination, navigation]) => ({
      ...navigation,
      paginationBeginCfi: pagination.begin.cfi,
    })),
    distinctUntilChanged(
      (previous, next) =>
        previous.paginationBeginCfi === next.paginationBeginCfi,
    ),
    map(
      (navigation): InternalNavigationEntry => ({
        ...navigation,
        meta: { triggeredBy: "pagination" },
        requestedPosition: navigation.position,
      }),
    ),
  )
