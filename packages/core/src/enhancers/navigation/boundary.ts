import { filter, map, type Observable, share } from "rxjs"
import type { Reader } from "../../reader"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"

export type BoundaryReachedEvent = { boundary: "start" | "end" }

/**
 * Decide whether a requested position falls before the start, past the end,
 * or sits inside the spine. Direction-aware so RTL books map the physical
 * right edge to "start" and the left edge to "end" in reading order.
 *
 * Returns `undefined` when the request is in-bounds; the request's *sign*
 * relative to the spine extent disambiguates start from end without needing
 * any clamping or post-navigation state.
 *
 * The spine extent is treated as half-open (`[left, right)` × `[top, bottom)`),
 * matching the rest of the codebase's hit-testing (see e.g.
 * `getSpineItemFromPosition`). A request at exactly `layout.right` —
 * which is what `position + pageWidth` resolves to when turning right on
 * the last page — is therefore correctly classified as past the end.
 */
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
    if (requested.x <= layout.left) return "end"
  } else {
    if (requested.x < 0) return "start"
    if (requested.x >= layout.right) return "end"
  }

  return undefined
}

/**
 * Emits when a navigation request targets a position that is outside the
 * spine — i.e. the user (or programmatic caller) asked to go past the start
 * or end of the book.
 *
 * @remarks
 * Detection is a direct sign-of-overshoot check on
 * `requestedNavigation.position` against the spine extent. No comparison with
 * the resolved position, no re-running of the navigator's clamp logic — both
 * of those approaches were too lossy: position gets shifted around by
 * restoration, spread-snap, viewport-fit clamping, etc. for perfectly
 * legitimate in-bounds turns, and using them as a proxy for "boundary
 * attempt" produced false positives (e.g. page 2 → page 1 firing as a
 * "start reached" event because some downstream pipeline step nudged the
 * resolved x by a couple of pixels).
 *
 * Restoration / pagination cycles are self-driven: the navigator resets
 * `requestedNavigation` to mirror the resolved `position`, so they are
 * in-bounds by construction and never trigger this event.
 *
 * The source stream is `settledNavigation$`, so per-frame pan/throttle
 * `navigate()` calls and in-flight viewport animations are filtered out at
 * the source.
 */
export const observeBoundaryReached = (
  reader: Reader,
): Observable<BoundaryReachedEvent> =>
  reader.navigation.settledNavigation$.pipe(
    map((navigation) => {
      const requested = navigation.requestedNavigation.position
      return requested
        ? detectOutOfBoundsBoundary(reader, requested)
        : undefined
    }),
    filter((boundary): boundary is "start" | "end" => boundary !== undefined),
    map((boundary) => ({ boundary })),
    share(),
  )
