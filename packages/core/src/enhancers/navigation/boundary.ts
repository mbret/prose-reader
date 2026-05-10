import { filter, map, type Observable, share } from "rxjs"
import { waitForNavigationSettled } from "../../navigation/operators"
import type { Reader } from "../../reader"

export type BoundaryReachedEvent = { boundary: "start" | "end" }

/**
 * Emits when a navigation request targets a position outside the spine's
 * current extent. Pure geometric primitive — no content-lifecycle
 * semantics. For "end of book reached" with lazy-load awareness, compose
 * with readiness signals (see `observeBookBoundaryReached`).
 */
export const outOfSpineBoundary = (
  reader: Reader,
): Observable<BoundaryReachedEvent> =>
  reader.navigation.navigation$.pipe(
    filter((navigation) => navigation.triggeredBy === "user"),
    waitForNavigationSettled(reader.navigation.navigationState$),
    map((navigation) => {
      const requested = navigation.requestedPosition
      const visibleArea =
        reader.settings.values.computedPageTurnMode === "scrollable"
          ? reader.viewport.relativeViewport
          : reader.viewport.absoluteViewport

      return requested
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
