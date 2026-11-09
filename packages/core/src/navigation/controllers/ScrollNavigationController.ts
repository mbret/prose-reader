import {
  filter,
  fromEvent,
  map,
  merge,
  NEVER,
  type Observable,
  of,
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
 * Whether two readings of the element's scroll offsets show the same place.
 * Less than a pixel apart they do: a browser can report an offset a fraction
 * of a pixel away from the one it was given.
 */
const showSamePlace = (a: ScrollPosition, b: ScrollPosition) =>
  Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1

export class ScrollNavigationController
  extends ReactiveEntity<{
    element: HTMLElement | undefined
  }>
  implements NavigationModeController
{
  protected navigateSubject = new Subject<ScrollNavigationEntry>()

  /**
   * A scroll is instant, so a navigation is over by the time `navigate`
   * returns: the controller is never in the middle of one.
   */
  public isNavigating$: Observable<boolean> = of(false)

  /**
   * Each scroll event that shows a move the reader did not make: the user's
   * scrolling. Never emits in controlled mode.
   *
   * A scroll event does not say who scrolled, and the one the reader causes
   * comes a frame or more after what caused it. So a move is told from the
   * offsets themselves: an event at the offsets the reader last left the
   * element at, or the last event showed, shows no move. The reader leaves
   * the element at new offsets in two ways:
   *
   * - A navigation scrolls it.
   * - A layout moves or resizes the items in it, and the browser clamps the
   *   offsets to what is left to scroll, as when the pages of a book go from
   *   side by side to stacked.
   *
   * A layout whose items are laid out over several tasks can be clamped
   * before it is done, and that scroll is still taken for a move.
   */
  public scrollNotMadeByReader$: Observable<Event>

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

    /** The scroll offsets each navigation leaves the element at. */
    const scrollPositionLeftByNavigation$ = this.navigateSubject.pipe(
      map((navigation) => this.applyNavigationPosition(navigation)),
      filter(isDefined),
      share(),
    )

    this.scrollNotMadeByReader$ = this.watch("element").pipe(
      filter(isDefined),
      switchMap((element) =>
        settings.watch(["computedPageTurnMode"]).pipe(
          switchMap(({ computedPageTurnMode }) => {
            if (computedPageTurnMode === "controlled") return NEVER

            return merge(
              merge(
                scrollPositionLeftByNavigation$,
                // Read in the task that laid the items out, before the
                // browser reports what that did to the offsets.
                spine.itemsLayout$.pipe(map(() => this.scrollPosition)),
              ).pipe(
                map((scrollPosition) => ({
                  scrollPosition,
                  scrollEvent: undefined,
                })),
              ),
              fromEvent(element, `scroll`).pipe(
                map((scrollEvent) => ({
                  scrollPosition: this.scrollPosition,
                  scrollEvent,
                })),
              ),
            ).pipe(
              scan<
                {
                  scrollPosition: ScrollPosition
                  scrollEvent: Event | undefined
                },
                {
                  knownScrollPosition: ScrollPosition
                  scrollEventOfMove: Event | undefined
                }
              >(
                ({ knownScrollPosition }, { scrollPosition, scrollEvent }) => ({
                  knownScrollPosition: scrollPosition,
                  scrollEventOfMove:
                    scrollEvent &&
                    !showSamePlace(knownScrollPosition, scrollPosition)
                      ? scrollEvent
                      : undefined,
                }),
                // Wherever the element is by now, the reader knows of it.
                {
                  knownScrollPosition: this.scrollPosition,
                  scrollEventOfMove: undefined,
                },
              ),
              map(({ scrollEventOfMove }) => scrollEventOfMove),
              filter(isDefined),
            )
          }),
        ),
      ),
      share(),
    )

    merge(elementCreation$, scrollPositionLeftByNavigation$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /**
   * Scrolls the element to a navigation's position, and gives the offsets it
   * is left at, which the browser clamps to what the content allows.
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
  protected applyNavigationPosition({ position }: ScrollNavigationEntry) {
    const element = this.value.element

    if (!element) return undefined

    const scaledPosition = this.fromSpinePosition(position)

    if (
      Math.round(scaledPosition.x) === element.scrollLeft &&
      Math.round(scaledPosition.y) === element.scrollTop
    ) {
      return this.scrollPosition
    }

    element.scrollTo({
      left: scaledPosition.x,
      top: scaledPosition.y,
      behavior: "instant",
    })

    this.hookManager.execute("onViewportOffsetAdjust", undefined)

    return this.scrollPosition
  }

  /**
   * Makes the element the box the book scrolls in while the page turn mode is
   * scrollable, and takes its box away otherwise, leaving its contents where
   * they are.
   */
  public displaySurfaceWhileActive() {
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
    this.value.element?.remove()
  }

  navigate(navigation: NavigationModeControllerNavigationEntry) {
    this.navigateSubject.next(navigation)
  }

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
