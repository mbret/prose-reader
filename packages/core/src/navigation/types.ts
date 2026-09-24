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
 * Each type of target a navigation can ask for, and the value it carries.
 */
export type NavigationTargetValues = {
  /** A position in the spine. */
  position: SpinePosition | UnboundSpinePosition
  /** The start of a spine item, by index or id. */
  spineItem: number | string
  /** A cfi. */
  cfi: string
  /**
   * A place in a spine item's document, which `select` finds once the
   * document is there. Until then the navigation goes to the start of the
   * item, and each restoration tries again.
   */
  selector: {
    spineItem: number | string
    select: (document: Document) => NodePosition | undefined
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
   * Where this navigation takes the reader in the text, the value restoration
   * returns to. Named by the target when it is a cfi, otherwise found by
   * `withAnchor` for every entry, restorations included; `undefined` until
   * the page it goes to is laid out.
   */
  anchor?: string
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
