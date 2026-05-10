import {
  EMPTY,
  filter,
  first,
  identity,
  map,
  type Observable,
  of,
  share,
  switchMap,
  timeout,
} from "rxjs"
import { takeUntilNextNavigationSettled } from "../../navigation/operators"
import type { Reader } from "../../reader"
import { type BoundaryReachedEvent, outOfSpineBoundary } from "./boundary"

const DEFAULT_ITEM_READINESS_TIMEOUT_MS = 5_000

export type BookBoundaryReachedOptions = {
  /**
   * Max wait for the last spine item to become ready before dropping an
   * `"end"` event. `Infinity` waits indefinitely. Ignored for `"start"`
   * (always emits immediately).
   *
   * @defaultValue 5000
   */
  itemReadinessTimeoutMs?: number
}

export type BookBoundaryReachedEvent = BoundaryReachedEvent

/**
 * Product-level "user reached the start/end of the book" signal: composes
 * {@link outOfSpineBoundary} with last-item readiness so `"end"` events are
 * withheld while the spine is still growing through lazy loads. `"start"`
 * passes through immediately.
 */
export const observeBookBoundaryReached = (
  reader: Reader,
  {
    itemReadinessTimeoutMs = DEFAULT_ITEM_READINESS_TIMEOUT_MS,
  }: BookBoundaryReachedOptions = {},
): Observable<BookBoundaryReachedEvent> =>
  outOfSpineBoundary(reader).pipe(
    switchMap((event) => {
      if (event.boundary === "start") return of(event)

      const items = reader.spineItemsManager.items
      const lastItem = items[items.length - 1]
      if (!lastItem) return EMPTY

      if (lastItem.value.isReady) return of(event)

      return lastItem.isReady$.pipe(
        filter(Boolean),
        first(),
        map(() => event),
        itemReadinessTimeoutMs === Infinity
          ? identity
          : timeout({
              first: itemReadinessTimeoutMs,
              with: () => EMPTY,
            }),
        takeUntilNextNavigationSettled(reader.navigation),
      )
    }),
    share(),
  )
