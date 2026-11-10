import {
  filter,
  fromEvent,
  map,
  merge,
  NEVER,
  type Observable,
  Subject,
  scan,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs"
import { HTML_PREFIX_SCROLL_NAVIGATOR } from "../../constants"
import type { Context } from "../../context/Context"
import type { HookManager } from "../../hooks/HookManager"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { Spine } from "../../spine/Spine"
import { type SpinePosition, UnboundSpinePosition } from "../../spine/types"
import { AbstractPosition } from "../../types"
import { setStylePropertyIfChanged } from "../../utils/dom"
import { isDefined } from "../../utils/isDefined"
import { ReactiveEntity } from "../../utils/ReactiveEntity"
import { watchKeys } from "../../utils/rxjs"
import type { Viewport } from "../../viewport/Viewport"
import type {
  NavigationModeController,
  NavigationModeControllerNavigationEntry,
} from "../types"

export class ScrollPosition extends AbstractPosition {}
export class UnboundScrollPosition extends AbstractPosition {
  public readonly __symbol = Symbol(`UnboundScrollPosition`)
}

export type ScrollNavigationEntry = NavigationModeControllerNavigationEntry

/**
 * Offsets less than a pixel apart are taken for the same place, so that a
 * browser reporting one place with offsets a fraction of a pixel apart shows
 * no move.
 */
const isSameScrollPlace = (a: ScrollPosition, b: ScrollPosition) =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1

export class ScrollNavigationController
  extends ReactiveEntity<{
    element: HTMLElement | undefined
  }>
  implements NavigationModeController
{
  /** Emits once a navigation has left the element where it goes. */
  private readonly navigationAppliedSubject = new Subject<void>()

  /**
   * Whether the book scrolls: the computed page turn mode is `scrollable`.
   * Replays the current value, then emits at each change of mode.
   */
  public readonly isActive$: Observable<boolean>

  /**
   * The offsets of the element at each scroll event that shows a move the
   * reader did not make: the user's scrolling. Never emits in controlled
   * mode.
   *
   * A scroll event does not say who scrolled, and the one the reader causes
   * comes a frame or more after what caused it. So a move is told from the
   * offsets themselves: an event at the offsets the reader last left the
   * element at, or the last move took it to, shows no move. The reader leaves
   * the element at offsets of its own in two ways:
   *
   * - A navigation scrolls it.
   * - A layout moves or resizes the items in it, and the browser clamps the
   *   offsets to what is left to scroll, as when the pages of a book go from
   *   side by side to stacked.
   *
   * A layout whose items are laid out over several tasks can be clamped
   * before it is done, and that scroll is still taken for a move.
   */
  public readonly scrollNotMadeByReader$: Observable<ScrollPosition>

  constructor(
    protected viewport: Viewport,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
    protected spine: Spine,
    protected context: Context,
  ) {
    super({
      element: undefined,
    })

    const elementCreation$ = this.context.pipe(
      watchKeys(["rootElement"]),
      tap(({ rootElement }) => {
        if (!rootElement) return

        const element = this.context.document.createElement(`div`)
        element.setAttribute(`data-${HTML_PREFIX_SCROLL_NAVIGATOR}`, "")
        element.appendChild(this.viewport.value.element)
        rootElement.appendChild(element)

        this.update({ element })
      }),
    )

    this.isActive$ = settings
      .watch(["computedPageTurnMode"])
      .pipe(map(() => this.isActive()))

    this.scrollNotMadeByReader$ = this.watch("element").pipe(
      filter(isDefined),
      switchMap((element) =>
        this.isActive$.pipe(
          switchMap((isActive) =>
            isActive ? this.observeScrollsNotMadeByReader(element) : NEVER,
          ),
        ),
      ),
      share(),
    )

    elementCreation$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  private observeScrollsNotMadeByReader(element: HTMLElement) {
    return merge(
      merge(
        this.navigationAppliedSubject,
        // Read in the task that laid the items out, before the browser
        // reports what that did to the offsets.
        this.spine.itemsLayout$,
      ).pipe(
        map(() => ({
          scrollPosition: this.scrollPosition,
          isScrollEvent: false,
        })),
      ),
      fromEvent(element, `scroll`).pipe(
        map(() => ({
          scrollPosition: this.scrollPosition,
          isScrollEvent: true,
        })),
      ),
    ).pipe(
      scan(
        (
          { scrollPositionKnownToReader },
          { scrollPosition, isScrollEvent },
        ) => {
          /**
           * An event that shows no move leaves the known offsets as they are,
           * so that a scroll of less than a pixel at a time adds up to a
           * move.
           */
          if (
            isScrollEvent &&
            isSameScrollPlace(scrollPositionKnownToReader, scrollPosition)
          )
            return { scrollPositionKnownToReader, isMoveNotMadeByReader: false }

          return {
            scrollPositionKnownToReader: scrollPosition,
            isMoveNotMadeByReader: isScrollEvent,
          }
        },
        // An event at the offsets the element has as this starts shows no
        // move.
        {
          scrollPositionKnownToReader: this.scrollPosition,
          isMoveNotMadeByReader: false,
        },
      ),
      filter(({ isMoveNotMadeByReader }) => isMoveNotMadeByReader),
      map(({ scrollPositionKnownToReader }) => scrollPositionKnownToReader),
    )
  }

  /**
   * Scrolls the element to a navigation's position.
   *
   * Authoritative DOM-scroll dedup: this controller owns the surface and
   * is the only place that can compare against the actual scaled scroll
   * target. Upstream same-`SpinePosition` dedup is unsafe because the same
   * spine position maps to different DOM scroll targets after a scale
   * change, layout reflow, or external scroll drift.
   *
   * @see https://stackoverflow.com/questions/22111256/translate3d-vs-translate-performance
   * for remark about flicker / fonts smoothing
   */
  protected applyNavigationPosition(
    element: HTMLElement,
    { position }: ScrollNavigationEntry,
  ) {
    const scaledPosition = this.fromSpinePosition(position)

    if (
      Math.round(scaledPosition.x) === element.scrollLeft &&
      Math.round(scaledPosition.y) === element.scrollTop
    ) {
      return
    }

    element.scrollTo({
      left: scaledPosition.x,
      top: scaledPosition.y,
      behavior: "instant",
    })

    this.hookManager.execute("onViewportOffsetAdjust", undefined)
  }

  /**
   * Makes the element the box the book scrolls in while the page turn mode is
   * scrollable, and takes its box away otherwise, leaving its contents where
   * they are.
   */
  public syncRenderingLayerDisplay() {
    const { element } = this.value

    if (!element) return

    setStylePropertyIfChanged(
      element.style,
      `display`,
      this.isActive() ? `block` : `contents`,
    )
  }

  public update(
    value: Partial<{
      element: HTMLElement | undefined
    }>,
  ) {
    this.mergeCompare(value)
  }

  public destroy() {
    super.destroy()
    this.navigationAppliedSubject.complete()
    this.value.element?.remove()
  }

  /**
   * Scrolls with `behavior: "instant"`, so the navigation is over when this
   * returns.
   */
  navigate(navigation: NavigationModeControllerNavigationEntry) {
    const { element } = this.value

    if (!element) return

    this.applyNavigationPosition(element, navigation)
    // Also for a navigation that found the element where it goes: the
    // browser may have moved it there, and not have reported it yet.
    this.navigationAppliedSubject.next()
  }

  /** Whether the book scrolls: the computed page turn mode is `scrollable`. */
  public isActive = () => {
    return this.settings.values.computedPageTurnMode === "scrollable"
  }

  public getNavigationVisibleArea = () => this.viewport.relativeViewport

  public fromScrollPosition(position: UnboundScrollPosition | ScrollPosition) {
    const scaleFactor = this.viewport.scaleFactor

    return new UnboundSpinePosition({
      x: position.x / scaleFactor,
      y: position.y / scaleFactor,
    })
  }

  public fromSpinePosition(position: UnboundSpinePosition | SpinePosition) {
    const scaleFactor = this.viewport.scaleFactor

    return new ScrollPosition({
      x: position.x * scaleFactor,
      y: position.y * scaleFactor,
    })
  }

  public get scrollPosition() {
    const element = this.value.element

    return new ScrollPosition({
      x: element?.scrollLeft ?? 0,
      y: element?.scrollTop ?? 0,
    })
  }
}
