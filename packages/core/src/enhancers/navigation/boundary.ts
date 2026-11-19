import { filter, map, type Observable, share } from "rxjs"
import { waitForNavigationSettled } from "../../navigation/operators.ts"
import type { Reader } from "../../reader.ts"

export type BoundaryReachedEvent = { boundary: "start" | "end" }

/**
 * Emits when a navigation request targets a position outside
 * `reader.spine.boundingBox`, and nothing until the spine has one. Pure
 * geometric primitive, with no content-lifecycle semantics. For "end of book
 * reached" with lazy-load awareness, compose with readiness signals (see
 * `observeBookBoundaryReached`).
 */
export const outOfSpineBoundary = (
  reader: Reader,
): Observable<BoundaryReachedEvent> =>
  reader.navigation.navigation$.pipe(
    filter((navigation) => navigation.triggeredBy === "user"),
    waitForNavigationSettled(reader.navigation.navigationState$),
    map((navigation) => {
      const requested = navigation.requestedPosition
      const visibleArea = navigation.requestedVisibleArea

      return requested && visibleArea
        ? reader.navigation.navigationResolver.getBoundaryForPosition(
            requested,
            visibleArea,
          )
        : undefined
    }),
    filter((boundary): boundary is "start" | "end" => boundary !== undefined),
    map((boundary) => ({ boundary })),
    share(),
  )
