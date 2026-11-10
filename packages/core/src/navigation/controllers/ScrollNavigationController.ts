import {
  distinctUntilChanged,
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

const ALMOST_ONE_PIXEL = 0.99

/**
 * What the element shows at its top left corner as a layout starts: the spine
 * item there, where the last completed layout put it, and the offsets of the
 * element then.
 */
type LayoutScrollAnchor = {
  spineItemIndex: number
  spineItemPlaceBeforeLayout: { left: number; top: number }
  scrollPositionBeforeLayout: ScrollPosition
}

/**
 * The scroll anchor of the layout that runs, then of the one that ended. A
 * layout has none to keep when the element showed no spine item at its corner
 * as it started, or scrolled since.
 */
type LayoutScrollAnchoring =
  | { stage: "noLayoutRunning" }
  | { stage: "layingOut"; scrollAnchor: LayoutScrollAnchor | undefined }
  | { stage: "laidOut"; scrollAnchor: LayoutScrollAnchor | undefined }

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
   * The offsets of the element each time the reader finds it moved by
   * something else than itself: the user's scrolling. Never emits in
   * controlled mode.
   *
   * A scroll event does not say who scrolled, and the one the reader causes
   * comes a frame or more after what caused it. So a move is told from the
   * offsets themselves: the element at the offsets the reader last left it
   * at, or the last move took it to, has not moved. The reader looks at each
   * scroll event, and as a layout starts, where it finds a move the browser
   * has not reported yet. It leaves the element at offsets of its own in two
   * ways:
   *
   * - A navigation scrolls it.
   * - A layout moves or resizes the items in it. The reader scrolls the
   *   element by as much as the item at its top left corner moved, so that
   *   it keeps showing the same place. The browser also clamps the offsets
   *   to what is left to scroll, as when the pages of a book go from side by
   *   side to stacked.
   *
   * The offsets a layout leaves are read once its last item is laid out.
   * Stacked items end where the last one does, so the browser clamps the
   * offsets as that item moves, in the task of the read. That holds when a
   * renderer lays the items before it out over several tasks, as the pdf one
   * does. A sideways scroll that a wider item before the last one allowed is
   * the exception: its clamp can come before the read, and is then taken for
   * a move.
   */
  public readonly scrollNotMadeByReader$: Observable<ScrollPosition>

  /**
   * The offsets of the element as the reader last knew them, each time they
   * change: where it found the element, at a scroll event or as a layout
   * starts, or where it left it, after a navigation or a layout. Never emits
   * in controlled mode, and does not replay.
   *
   * Unlike `scrollPosition`, it does not read the element. So its latest
   * value still holds once the element has lost its box, and its offsets with
   * it, as after a change to controlled mode.
   */
  public readonly scrollPositionKnownToReader$: Observable<ScrollPosition>

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

    const scrollOfElementWhileActive$ = this.watch("element").pipe(
      filter(isDefined),
      switchMap((element) =>
        this.isActive$.pipe(
          switchMap((isActive) =>
            isActive ? this.followScrollOfElement(element) : NEVER,
          ),
        ),
      ),
      share(),
    )

    this.scrollNotMadeByReader$ = scrollOfElementWhileActive$.pipe(
      filter(({ isMoveNotMadeByReader }) => isMoveNotMadeByReader),
      map(({ scrollPositionKnownToReader }) => scrollPositionKnownToReader),
    )

    this.scrollPositionKnownToReader$ = scrollOfElementWhileActive$.pipe(
      map(({ scrollPositionKnownToReader }) => scrollPositionKnownToReader),
      // A look that finds no move keeps the offsets it had.
      distinctUntilChanged(),
    )

    elementCreation$.pipe(takeUntil(this.destroy$)).subscribe()

    /**
     * Followed for the controller's own sake, whether or not anything listens
     * to the streams above: following the element is also what keeps it on
     * the same place through each layout.
     */
    scrollOfElementWhileActive$.pipe(takeUntil(this.destroy$)).subscribe()
  }

  /**
   * Follows where the element is while the book scrolls: the offsets the
   * reader knows it at, and whether it found the element moved by something
   * else than itself. It also keeps the element on the same place through
   * each layout, which moves it, see `keepScrollAnchorThroughLayouts`.
   */
  private followScrollOfElement(element: HTMLElement) {
    return merge(
      merge(
        this.navigationAppliedSubject,
        // Read in the task that laid the items out, before the browser
        // reports what that did to the offsets.
        this.keepScrollAnchorThroughLayouts(element),
      ).pipe(
        map(() => ({
          scrollPosition: this.scrollPosition,
          isLeftThereByReader: true,
        })),
      ),
      merge(
        fromEvent(element, `scroll`),
        // Before the layout moves anything: what the browser has not
        // reported by then, the layout would hide.
        this.spine.itemsLayoutStart$,
      ).pipe(
        map(() => ({
          scrollPosition: this.scrollPosition,
          isLeftThereByReader: false,
        })),
      ),
    ).pipe(
      scan(
        (
          { scrollPositionKnownToReader },
          { scrollPosition, isLeftThereByReader },
        ) => {
          /**
           * A look that finds no move leaves the known offsets as they are,
           * so that a scroll of less than a pixel at a time adds up to a
           * move.
           */
          if (
            !isLeftThereByReader &&
            isSameScrollPlace(scrollPositionKnownToReader, scrollPosition)
          )
            return { scrollPositionKnownToReader, isMoveNotMadeByReader: false }

          return {
            scrollPositionKnownToReader: scrollPosition,
            isMoveNotMadeByReader: !isLeftThereByReader,
          }
        },
        // The element at the offsets it has as this starts has not moved.
        {
          scrollPositionKnownToReader: this.scrollPosition,
          isMoveNotMadeByReader: false,
        },
      ),
    )
  }

  /**
   * Keeps the element on the same place through each layout: once a pass has
   * laid the items out, scrolls the element by as much as the pass moved the
   * spine item at its top left corner. That is the task that moved the item
   * for a pass that lays out at once, as the html renderer's does, so no
   * frame shows another place. Emits once that is done, for each pass.
   *
   * Without it, a spine item that changes size above the screen, as when it
   * loads, moves everything after it under the user. The navigation is only
   * restored once the pages of the layout are published, frames later, and
   * not at all while the user scrolls.
   *
   * The anchor is read as the pass starts, before any item moves. A pass that
   * stops and starts again keeps the one read first, since it finds items it
   * moved already. Once the element scrolls during the pass, by the user or
   * by a navigation, there is nothing left to keep: where it then is was
   * chosen with the items as the pass had them. Only a pass that takes
   * several tasks leaves time for that, as the pdf renderer's does. Such a
   * pass also shows its items where it moved them until its last one is laid
   * out, and a scroll the browser has not reported by then is lost: the
   * element is taken back to its anchor.
   */
  private keepScrollAnchorThroughLayouts(
    element: HTMLElement,
  ): Observable<unknown> {
    const noLayoutRunning: LayoutScrollAnchoring = { stage: "noLayoutRunning" }

    return merge(
      this.spine.itemsLayoutStart$.pipe(
        map(() => ({
          type: "itemsLayoutStart" as const,
          scrollAnchor: this.readLayoutScrollAnchor(),
        })),
      ),
      merge(this.navigationAppliedSubject, fromEvent(element, `scroll`)).pipe(
        map(() => ({
          type: "elementScroll" as const,
          scrollPosition: this.scrollPosition,
        })),
      ),
      this.spine.itemsLayout$.pipe(
        map(() => ({ type: "itemsLaidOut" as const })),
      ),
    ).pipe(
      scan((anchoring, event): LayoutScrollAnchoring => {
        if (event.type === "itemsLaidOut")
          return {
            stage: "laidOut",
            scrollAnchor:
              anchoring.stage === "layingOut"
                ? anchoring.scrollAnchor
                : undefined,
          }

        if (event.type === "itemsLayoutStart")
          return anchoring.stage === "layingOut"
            ? anchoring
            : { stage: "layingOut", scrollAnchor: event.scrollAnchor }

        if (anchoring.stage !== "layingOut") return noLayoutRunning

        const hasElementScrolledSinceLayoutStart =
          anchoring.scrollAnchor !== undefined &&
          !isSameScrollPlace(
            anchoring.scrollAnchor.scrollPositionBeforeLayout,
            event.scrollPosition,
          )

        return hasElementScrolledSinceLayoutStart
          ? { stage: "layingOut", scrollAnchor: undefined }
          : anchoring
      }, noLayoutRunning),
      filter((anchoring) => anchoring.stage === "laidOut"),
      tap(({ scrollAnchor }) => {
        if (scrollAnchor)
          this.scrollToKeepLayoutScrollAnchor(element, scrollAnchor)
      }),
    )
  }

  /**
   * A browser can keep whole pixels of an offset only, and then leaves the
   * element a fraction of a pixel short of the top of the spine item a
   * navigation went to. So the spine item at the corner is looked up almost a
   * pixel inside the element: one that starts less than a pixel past the
   * corner is the one there, as offsets less than a pixel apart are the same
   * place.
   */
  private readLayoutScrollAnchor(): LayoutScrollAnchor | undefined {
    const scrollPosition = this.scrollPosition
    const spineItem = this.spine.locator.getSpineItemFromPosition(
      this.fromScrollPosition(
        new ScrollPosition({
          x: scrollPosition.x + ALMOST_ONE_PIXEL,
          y: scrollPosition.y + ALMOST_ONE_PIXEL,
        }),
      ),
    )

    if (!spineItem) return undefined

    const { left, top } = this.spine.getSpineItemSpineLayoutInfo(spineItem)

    return {
      spineItemIndex: spineItem.index,
      spineItemPlaceBeforeLayout: { left, top },
      scrollPositionBeforeLayout: scrollPosition,
    }
  }

  /**
   * Scrolls the element by as much as the layout that just ended moved the
   * spine item of the anchor.
   */
  private scrollToKeepLayoutScrollAnchor(
    element: HTMLElement,
    {
      spineItemIndex,
      spineItemPlaceBeforeLayout,
      scrollPositionBeforeLayout,
    }: LayoutScrollAnchor,
  ) {
    const { left, top } = this.spine.getSpineItemSpineLayoutInfo(spineItemIndex)
    const distanceMoved = {
      x: left - spineItemPlaceBeforeLayout.left,
      y: top - spineItemPlaceBeforeLayout.top,
    }

    // Most passes move nothing at the corner: the scale is not measured then.
    if (distanceMoved.x === 0 && distanceMoved.y === 0) return

    const scaleFactor = this.viewport.scaleFactor

    this.scrollElementTo(
      element,
      new ScrollPosition({
        x: scrollPositionBeforeLayout.x + distanceMoved.x * scaleFactor,
        y: scrollPositionBeforeLayout.y + distanceMoved.y * scaleFactor,
      }),
    )
  }

  /** Scrolls the element at once, and tells the hooks its offsets moved. */
  private scrollElementTo(element: HTMLElement, { x, y }: ScrollPosition) {
    element.scrollTo({ left: x, top: y, behavior: "instant" })

    this.hookManager.execute("onViewportOffsetAdjust", undefined)
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

    this.scrollElementTo(element, scaledPosition)
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
