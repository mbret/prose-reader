import type { Observable } from "rxjs"
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import type {
  SpineItemPosition,
  UnboundSpineItemPagePosition,
} from "../spineItem/types"

export type SpineBoundary = "start" | "end"

export type NavigationVisibleArea = {
  width: number
  height: number
}

/**
 * Each type of target a navigation can ask for, and the value it carries. A
 * navigation whose target names nothing in the book, such as a spine item the
 * book does not have, is ignored.
 */
export type NavigationTargetValues = {
  /** A position in the spine, clamped to it. */
  position: SpinePosition | UnboundSpinePosition
  /** The start of a spine item, by index or id. */
  spineItem: number | string
  /**
   * A cfi. One that can't be read names nothing in the book. One whose path
   * leads to nothing in its spine item's document goes to the start of the
   * item.
   */
  cfi: string
  /**
   * A place in a spine item's document, which `find` looks for once the
   * document is there. Until then the navigation goes to the start of the
   * item, and each restoration tries again.
   *
   * `find` runs synchronously inside the navigation, and may be called
   * several times, or not at all when the reader navigates elsewhere first.
   * Keep it quick and free of side effects, and do not modify the document.
   * One that throws finds nothing.
   */
  selector: {
    spineItem: number | string
    find: (document: Document) => NodePosition | undefined
  }
}

/** A node, and an offset in it when it is text. */
export type NodePosition = {
  node: Node
  offset?: number
}

export type NavigationTargetType = keyof NavigationTargetValues

/**
 * What a navigation asks for: exactly one target, of one type.
 */
export type NavigationTarget<
  Type extends NavigationTargetType = NavigationTargetType,
> = {
  [T in Type]: {
    type: T
    value: NavigationTargetValues[T]
  }
}[Type]

export type UserNavigationEntry<Target = NavigationTarget> = {
  target: Target
  animation?: boolean | "turn" | "snap"
  type?: "api" | "scroll"
}

/**
 * The targets a reader's `navigate` accepts: the ones of core, and those the
 * enhancers it was built with add.
 */
export type NavigationTargetOf<Reader> = Reader extends {
  navigation: { navigate: (to: UserNavigationEntry<infer Target>) => void }
}
  ? Target
  : never

export type NavigationModeControllerNavigationEntry = {
  position: SpinePosition | UnboundSpinePosition
  animation?: boolean | "turn" | "snap"
}

export type NavigationConsolidation = {
  spineItemHeight?: number
  spineItemWidth?: number
  spineItemTop?: number
  spineItemLeft?: number
  spineItemIsReady?: boolean
  spineItemIsUsingVerticalWriting?: boolean
  /**
   * Useful for restoration to anchor back at an accurate
   * position in the item. If the item changed its content
   * we cannot assume it's accurate and will need more info.
   */
  positionInSpineItem?: SpineItemPosition | UnboundSpineItemPagePosition
  /**
   * Useful in restoration to anchor back to spine item position.
   * Whether we should anchor from bottom or top of the item.
   * Works with `positionInSpineItem`
   *
   * @forward : We will try to restore position starting from beginning of
   * item. A target that names a place (an item, a cfi, a url) is always
   * forward.
   *
   * @backward : We will try to restore position starting from end of item.
   * Only a position target can be backward, guessed from the previous
   * navigation.
   */
  directionFromLastNavigation?: "forward" | "backward"
}

/**
 * Where the reader is in the book: what to save, and to open the book at with
 * a cfi target. It is where the current navigation takes the reader, as far as
 * the reader knows, and `status` says whether the reader has found that place.
 */
export type ReadingPosition = {
  /**
   * While the value is not a `success`, a cfi naming only its spine item,
   * which `reader.cfi.isRootCfi` tells, is that item's start, standing in for
   * a place the reader does not know.
   */
  cfi: string
  /**
   * How far into the book `cfi` is, from 0 to 1: where the page holding it
   * starts, estimated from each spine item's `progressionWeight` and the pages
   * of its own. A position on the last page is short of 1. While the value is
   * not a `success`, the start of the spine item the navigation goes to.
   */
  percentageEstimateOfBook: number
  /**
   * Whether the reader has found the place the navigation goes to. Every
   * value is where the reader is, as far as it knows, and the value to save.
   * Every navigation ends in `success` or `error`, which stays until the next
   * navigation.
   *
   * - `pending`: not yet. `cfi` is the start of the spine item the navigation
   *   goes to, while that item loads, or while the page the navigation lands
   *   on is not laid out. A target naming a place, a cfi or what a selector
   *   found, moves it to that place once its item's document shows it there,
   *   before the page holding it is laid out.
   * - `success`: the place the target names, or otherwise the first character
   *   of the page the navigation lands on, and where the page holding it
   *   starts.
   * - `error`: the spine item the navigation goes to failed to load, so no
   *   place in it can be found. `cfi` is what the reader knew by then: that
   *   item's start, or the place the target names.
   */
  status: "pending" | "success" | "error"
}

/**
 * Where a navigation takes the reader in the text, as far as the reader knows,
 * and how much of that place it has found, refined as the navigation goes. The
 * current navigation's is the reading position.
 *
 * - `standIn`: no place is known yet. `cfi` is the start of the spine item the
 *   navigation goes to, while that item loads, or while the page the
 *   navigation lands on is not laid out.
 * - `targetPlace`: `cfi` is the place the navigation's target names, a cfi or
 *   what a selector found, once its item's document shows it there. The page
 *   holding it is not laid out yet.
 * - `final`: the place the target names, or otherwise the first character of
 *   the page the navigation lands on, and where the page holding it starts. It
 *   stays until the next navigation.
 * - `error`: the spine item the navigation goes to failed to load while the
 *   anchor stood in or was the target's place, which it keeps. It stays until
 *   the next navigation.
 */
export type InternalNavigationAnchor = Pick<
  ReadingPosition,
  "cfi" | "percentageEstimateOfBook"
> & {
  state: "standIn" | "targetPlace" | "final" | "error"
}

/**
 * Priority of info taken for restoration:
 * - anchor
 * - spine item position
 * - spine item (fallback)
 */
export type InternalNavigationEntry = {
  /**
   * What the navigation asked for, as it asked for it. The target's resolver
   * turns it into what it tells of `spineItem`, `position` and `anchor`,
   * without changing it, and restorations carry it over.
   */
  target: NavigationTarget
  position: SpinePosition | UnboundSpinePosition
  id: symbol
  meta: {
    triggeredBy: `user` | `restoration`
  }
  /**
   * What *this entry* asked for — before the navigator clamped or
   * otherwise resolved it. `undefined` for `cfi` / `selector` / `spineItem`
   * navigations (no position component to compare).
   *
   * Each entry's `requestedPosition` reflects only that entry's intent:
   * - User entries: the raw user position (may be out of bounds).
   * - Restoration entries: the resolved `position` itself, because the
   *   entry's "request" *is* the resolved snap-back — there is no separate
   *   intent to preserve.
   *
   * Consumers needing the user's latest raw intent (e.g. boundary
   * detection for a pan past start/end whose clamping was deferred
   * behind a lock) should filter the navigation stream by
   * {@link Navigation.triggeredBy} === `"user"` rather than reading
   * any restoration entry's `requestedPosition`.
   */
  requestedPosition?: SpinePosition | UnboundSpinePosition
  /**
   * The viewport/surface rectangle that gives meaning to
   * `requestedPosition`. This is captured at request time so later consumers
   * do not need to know which navigation surface was active, and so a later
   * zoom/mode change cannot reinterpret the original request.
   */
  requestedVisibleArea?: NavigationVisibleArea
  type: `api` | `scroll`
  animation?: boolean | `turn` | `snap`
  /** The spine item the navigation resolved to. */
  spineItem?: string | number
  /**
   * Where this navigation takes the reader in the text, as far as the reader
   * knows: the reading position while it is the current navigation, and what
   * restoration returns to once it names a place rather than stands in. Every
   * entry with a spine item has one, restorations included.
   */
  anchor?: InternalNavigationAnchor
} & NavigationConsolidation

/**
 * A navigation surface describes the viewport rectangle that gives meaning to
 * a requested spine position.
 *
 * It intentionally knows nothing about how navigation is performed. Capturing
 * this area with a user request keeps boundary detection and clamping generic,
 * and prevents later viewport or mode changes from reinterpreting the original
 * request.
 */
export type NavigationSurface = {
  getNavigationVisibleArea: () => NavigationVisibleArea
}

/**
 * A navigation mode controller applies resolved navigation to its own rendering
 * layer. It also exposes the surface geometry used to interpret navigation
 * requests, while owning mode-specific concerns like activity, layout, busy
 * state, and DOM movement.
 */
export type NavigationModeController = NavigationSurface & {
  isActive: () => boolean
  isNavigating$: Observable<boolean>
  layout$?: Observable<unknown>
  navigate: (navigation: NavigationModeControllerNavigationEntry) => void
  destroy: () => void
}

export type InternalNavigationInput = Omit<
  InternalNavigationEntry,
  "position"
> & {
  position?: SpinePosition | UnboundSpinePosition
}

export type Navigation = Pick<
  InternalNavigationEntry,
  "position" | "id" | "requestedPosition" | "requestedVisibleArea"
> & {
  triggeredBy: InternalNavigationEntry["meta"]["triggeredBy"]
}
