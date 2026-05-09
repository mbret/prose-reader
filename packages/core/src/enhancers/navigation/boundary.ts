import { filter, map, type Observable, share } from "rxjs"
import type { Reader } from "../../reader"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"

export type BoundaryReachedEvent = { boundary: "start" | "end" }

const detectOutOfBoundsBoundary = (
  reader: Reader,
  requested: SpinePosition | UnboundSpinePosition,
): "start" | "end" | undefined => {
  const items = reader.spineItemsManager.items
  const lastItem = items[items.length - 1]
  if (!lastItem) return undefined

  const layout = reader.spine.getSpineItemSpineLayoutInfo(lastItem)
  const isRTL = reader.context.isRTL()

  if (requested.y < 0) return "start"
  if (requested.y >= layout.bottom) return "end"

  if (isRTL) {
    if (requested.x > 0) return "start"
    if (requested.x < layout.left) return "end"
  } else {
    if (requested.x < 0) return "start"
    if (requested.x >= layout.right) return "end"
  }

  return undefined
}

/**
 * Emits when a navigation request targets a position outside the spine's
 * current extent. Pure geometric primitive — no content-lifecycle
 * semantics. For "end of book reached" with lazy-load awareness, compose
 * with readiness signals (see `observeBookBoundaryReached`).
 */
export const outOfSpineBoundary = (
  reader: Reader,
): Observable<BoundaryReachedEvent> =>
  reader.navigation.settledNavigation$.pipe(
    map((navigation) => {
      const requested = navigation.requestedPosition
      return requested
        ? detectOutOfBoundsBoundary(reader, requested)
        : undefined
    }),
    filter((boundary): boundary is "start" | "end" => boundary !== undefined),
    map((boundary) => ({ boundary })),
    share(),
  )
