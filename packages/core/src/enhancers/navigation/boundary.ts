import { filter, map, type Observable, share } from "rxjs"
import type { Reader } from "../../reader"
import type { SpinePosition, UnboundSpinePosition } from "../../spine/types"

export type BoundaryReachedEvent = { boundary: "start" | "end" }

/**
 * Decide whether a requested position falls before the start, past the end,
 * or sits inside the spine, comparing against the spine's *current* extent.
 * Direction-aware so RTL books map the physical right edge to "start" and
 * the left edge to "end" in reading order.
 *
 * The spine extent is treated as half-open (`[left, right)` × `[top, bottom)`),
 * matching the rest of the codebase's hit-testing (see e.g.
 * `getSpineItemFromPosition`). A request at exactly `layout.right` —
 * which is what `position + pageWidth` resolves to when turning right on
 * the last page — is therefore correctly classified as past the end.
 *
 * @remarks
 * This is a pure geometric primitive: it answers "is the request outside
 * the spine *as currently laid out*". It does not know whether the spine
 * will grow (lazy-loaded items), whether the user is sitting on the last
 * spine item, or anything else about content lifecycle. Consumers that
 * care about "did we really reach the end of the book" should compose this
 * event with readiness signals (`spineItem.isReady$`) themselves.
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
 * spine — i.e. the user (or programmatic caller) asked to go past the
 * spine's current extent.
 *
 * @remarks
 * Pure navigation primitive: triggered by intent + spine geometry, with no
 * content-lifecycle semantics. Detection is a direct sign-of-overshoot
 * check on `requestedPosition` against the spine extent — no comparison
 * with the resolved `position` (it gets shifted around by restoration,
 * spread-snap, viewport-fit clamping, etc. for perfectly legitimate
 * in-bounds turns).
 *
 * "Spine's current extent" is the operative phrase: while a lazy-loaded
 * spine item is still loading, its `layoutInfo` is preliminary (often
 * `width=0`) and the spine appears shorter than it eventually will. A
 * navigation that overshoots that preliminary extent will emit here, even
 * though the book has more content yet to come. That is the correct
 * behaviour for a navigation primitive — the navigation *did* go past
 * what's currently laid out — but it means consumers wanting "end of book
 * reached" semantics must combine this event with a readiness signal
 * (e.g. wait for `lastItem.isReady$` before treating an `"end"` boundary
 * as final).
 *
 * Restoration / pagination cycles are self-driven: the navigator mirrors
 * `requestedPosition` to the resolved `position`, so they are in-bounds
 * by construction and never trip the sign check.
 *
 * The source stream is `settledNavigation$`, so per-frame pan/throttle
 * `navigate()` calls and in-flight viewport animations are filtered out at
 * the source.
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
