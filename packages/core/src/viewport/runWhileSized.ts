import { NEVER, type Observable, switchMap } from "rxjs"
import type { Viewport } from "./Viewport"

/**
 * Runs `work$` while the viewport has a size, and gives its values. It starts
 * at once when the viewport has one, otherwise once it has. If the viewport
 * loses its size, `work$` stops, and runs again from its start once the
 * viewport has a size.
 *
 * It goes on for as long as it is subscribed: the caller says when the work
 * is done, such as with `first()` for work that gives one value.
 */
export const runWhileSized = <T>(
  viewport: Viewport,
  work$: Observable<T>,
): Observable<T> =>
  viewport.isSized$.pipe(switchMap((isSized) => (isSized ? work$ : NEVER)))
