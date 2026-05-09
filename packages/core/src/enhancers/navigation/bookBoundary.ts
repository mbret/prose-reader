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
import type { Reader } from "../../reader"
import { type BoundaryReachedEvent, outOfSpineBoundary } from "./boundary"

const DEFAULT_ITEM_READINESS_TIMEOUT_MS = 5_000

export type BookBoundaryReachedOptions = {
  /**
   * How long to wait for the last spine item to become ready after an
   * `"end"` boundary event before giving up on it as a real "end of book"
   * signal. Set to `Infinity` to wait indefinitely.
   *
   * Only applies to the `"end"` boundary — the `"start"` side has no
   * symmetric concern (`x = 0` is always the start regardless of load
   * state) and passes through immediately.
   *
   * @defaultValue 5000
   */
  itemReadinessTimeoutMs?: number
}

export type BookBoundaryReachedEvent = BoundaryReachedEvent

/**
 * Emits whenever the user has demonstrably reached a boundary of the book —
 * either the start or the end — with content semantics applied. Use this
 * when you want product-level "the user finished the book" / "the user is
 * back at the beginning" signals; use {@link outOfSpineBoundary}
 * directly when you want the raw navigation primitive that fires on every
 * out-of-spine navigation regardless of load state.
 *
 * @remarks
 * Composed on top of {@link outOfSpineBoundary}, with asymmetric
 * gating per boundary side:
 *
 * - **`"start"`** passes through immediately. The start of the book is
 *   `x = 0` (or `y = 0`) by definition, regardless of which spine items
 *   are currently loaded.
 * - **`"end"`** waits for the last spine item to be ready before emitting,
 *   because the spine extent grows as items load. Without this gate, an
 *   `"end"` event would fire any time the user overshoots what's currently
 *   laid out — even when more content is yet to come. A subsequent boundary
 *   event cancels any pending wait, so rapid back-to-back overshoots don't
 *   pile up. If readiness never arrives within
 *   {@link BookBoundaryReachedOptions.itemReadinessTimeoutMs}, the event is
 *   dropped silently.
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
        // `Infinity` is the documented opt-out: bypass `timeout` entirely
        // because RxJS forwards the delay to `setTimeout`, which clamps
        // `Infinity` to ~1ms (Node) / 2^31-1 ms (browsers) and would
        // silently drop the pending end-boundary instead of waiting.
        itemReadinessTimeoutMs === Infinity
          ? identity
          : timeout({
              first: itemReadinessTimeoutMs,
              with: () => EMPTY,
            }),
      )
    }),
    share(),
  )
