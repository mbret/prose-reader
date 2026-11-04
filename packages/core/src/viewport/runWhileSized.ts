import { first, NEVER, type Observable, switchMap } from "rxjs"
import type { Viewport } from "./Viewport"

/**
 * Runs `work$` while the viewport has a size, and gives its first value. It
 * starts at once when the viewport has one, otherwise once it has. If the
 * viewport loses its size before `work$` gives a value, `work$` stops, and
 * runs again from its start once the viewport has a size.
 */
export const runWhileSized = <T>(
  viewport: Viewport,
  work$: Observable<T>,
): Observable<T> =>
  viewport.isSized$.pipe(
    switchMap((isSized) => (isSized ? work$ : NEVER)),
    first(),
  )
