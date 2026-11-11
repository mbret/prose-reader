import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  fromEvent,
  map,
  merge,
  NEVER,
  type Observable,
  Subject,
  scan,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
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

export class ScrollNavigationController
  extends ReactiveEntity<{
    element: HTMLElement | undefined
  }>
  implements NavigationModeController
{
  /**
   * Emits once the reader has left the element where it wants it: after a
   * navigation, and after it scrolled to keep its place through a layout.
   */
  private readonly scrollByReaderAppliedSubject = new Subject<void>()

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
   * offsets: the element at the offsets the reader last left it at, or the
   * last move took it to, has not moved. The reader looks at each scroll
   * event, and as a layout starts, where it finds a move the browser has not
   * reported yet. It leaves the element at offsets of its own after a
   * navigation, and after a layout, which it reads once the last item is
   * laid out.
   *
   * With a renderer that lays out over several tasks, as the pdf one does,
   * the browser can clamp a sideways scroll before that read, when a wider
   * item before the last one shrinks. That clamp is taken for a move.
   */
  public readonly scrollNotMadeByReader$: Observable<ScrollPosition>

  /**
   * The offsets of the element as the reader last knew them, each time they
   * change: where it found the element, or where it left it. Never emits in
   * controlled mode, and does not replay.
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

    const scrollOfElement$ = this.whileBookScrolls((element) =>
      this.followScrollOfElement(element),
    ).pipe(share())

    this.scrollNotMadeByReader$ = scrollOfElement$.pipe(
      filter(({ isMoveNotMadeByReader }) => isMoveNotMadeByReader),
      map(({ scrollPositionKnownToReader }) => scrollPositionKnownToReader),
    )

    this.scrollPositionKnownToReader$ = scrollOfElement$.pipe(
      map(({ scrollPositionKnownToReader }) => scrollPositionKnownToReader),
      // A look that finds no move keeps the offsets it had.
      distinctUntilChanged(),
    )

    elementCreation$.pipe(takeUntil(this.destroy$)).subscribe()

    // Whether or not anything listens for the user's scrolling.
    this.whileBookScrolls((element) =>
      this.keepScrollAnchorThroughLayouts(element),
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  /** Runs what a function gives for the element, while the book scrolls. */
  private whileBookScrolls<T>(
    observeElement: (element: HTMLElement) => Observable<T>,
  ) {
    return this.watch("element").pipe(
      filter(isDefined),
      switchMap((element) =>
        this.isActive$.pipe(
          switchMap((isActive) => (isActive ? observeElement(element) : NEVER)),
        ),
      ),
    )
  }

  /**
   * The offsets the reader knows the element at, and whether it found the
   * element moved by something else than itself, at each look and each
   * scroll of its own.
   */
  private followScrollOfElement(element: HTMLElement) {
    return merge(
      merge(
        this.scrollByReaderAppliedSubject,
        // Read in the task that laid the items out, before the browser
        // reports what that did to the offsets.
        this.spine.itemsLayout$,
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
   * laid the items out, scrolls by as much as it moved the spine item at the
   * top left corner.
   *
   * The anchor is read as the pass starts, and kept if the pass starts again:
   * the layouts the reader knows are from before both starts. Once anything
   * scrolls the element during the pass, there is nothing to keep: that place
   * was chosen with the items as the pass had them. Only a pass of several
   * tasks leaves time for that, as the pdf renderer's does.
   */
  private keepScrollAnchorThroughLayouts(element: HTMLElement) {
    return this.spine.itemsLayoutStart$.pipe(
      exhaustMap(() => {
        const scrollAnchor = this.readLayoutScrollAnchor()
        const hasElementScrolledSince$ = merge(
          this.scrollByReaderAppliedSubject,
          fromEvent(element, `scroll`),
        ).pipe(
          map(() => true),
          startWith(false),
        )

        return this.spine.itemsLayout$.pipe(
          first(),
          withLatestFrom(hasElementScrolledSince$),
          tap(([, hasElementScrolledSince]) => {
            if (scrollAnchor && !hasElementScrolledSince)
              this.scrollToKeepLayoutScrollAnchor(element, scrollAnchor)
          }),
        )
      }),
    )
  }

  private readLayoutScrollAnchor(): LayoutScrollAnchor | undefined {
    const scrollPosition = this.scrollPosition
    const spineItem = this.spine.locator.getSpineItemFromPosition(
      this.fromScrollPosition(scrollPosition),
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
    const scrollPositionThatKeepsAnchor = new ScrollPosition({
      x: scrollPositionBeforeLayout.x + distanceMoved.x * scaleFactor,
      y: scrollPositionBeforeLayout.y + distanceMoved.y * scaleFactor,
    })

    /**
     * The browser can have left the element there itself, as when it clamps
     * the offsets by as much as the item moved.
     */
    if (isSameScrollPlace(this.scrollPosition, scrollPositionThatKeepsAnchor))
      return

    this.scrollElementTo(element, scrollPositionThatKeepsAnchor)
    this.scrollByReaderAppliedSubject.next()
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
    this.scrollByReaderAppliedSubject.complete()
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
    this.scrollByReaderAppliedSubject.next()
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
