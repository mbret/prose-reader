import {
  defer,
  distinctUntilChanged,
  EMPTY,
  map,
  type Observable,
  Subject,
  startWith,
  takeUntil,
} from "rxjs"
import {
  CSS_VAR_ABSOLUTE_VIEWPORT_HEIGHT,
  CSS_VAR_ABSOLUTE_VIEWPORT_WIDTH,
  HTML_PREFIX_VIEWPORT,
} from "../constants"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpinePosition, UnboundSpinePosition } from "../spine/types"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../utils/dom"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { observeResize } from "../utils/rxjs"
import { shouldUseSpreadModeForViewport } from "./spreadMode"
import {
  AbsoluteViewport,
  RelativeViewport,
  ViewportSlicePosition,
} from "./types"

type State = {
  element: HTMLElement
  /**
   * Whether two pages share the viewport: the `spreadMode` setting, resolved
   * against the viewport's size and the book. It is decided in the same
   * measurement as the size and never changes outside of a layout, so it is
   * what the reader shows.
   */
  isSpread: boolean
  /**
   * Anything that can change the page size should trigger a layout and thus
   * force a recalculation of the page size.
   */
  pageSize: {
    width: number
    height: number
  }
  /**
   * To get the absolute viewport we consider clientWidth/clientHeight which gives more
   * flexibility for the reader container. For example when using scrollbar with scroll
   * navigator. The viewport dimensions will be affected by the scrollbar.
   *
   * The viewport dimensions are updated only before a layout.
   */
  width: number
  height: number
}

/** Whether a measured size has a width and a height to lay the book out at. */
const isSizeToLayOutAt = ({
  width,
  height,
}: {
  width: number
  height: number
}) => width > 0 && height > 0

export class Viewport extends ReactiveEntity<State> {
  private layoutSubject = new Subject<void>()
  /** Emits after the viewport is measured for a layout. */
  public readonly layout$ = this.layoutSubject.asObservable()

  constructor(
    protected context: Context,
    protected settingsManager: ReaderSettingsManager,
  ) {
    const element = context.document.createElement("div")

    element.setAttribute(`data-${HTML_PREFIX_VIEWPORT}`, "")

    super({
      element,
      isSpread: false,
      pageSize: {
        width: 1,
        height: 1,
      },
      width: 1,
      height: 1,
    })
  }

  private measure() {
    return {
      width: this.value.element.clientWidth,
      height: this.value.element.clientHeight,
    }
  }

  /**
   * Whether the element has a width and a height to lay the book out at.
   * Hidden, as under `display: none`, or out of the document, it measures 0
   * by 0. It measures the element, which costs a style and layout pass when
   * the DOM is dirty.
   */
  public hasSize() {
    return isSizeToLayOutAt(this.measure())
  }

  /**
   * Whether the element has a size, and not the one of the last layout, so
   * that laying out again would change anything. A resize to no size changes
   * nothing: no layout runs until the element has a size again. It measures
   * the element, which costs a style and layout pass when the DOM is dirty.
   */
  public hasNewSizeSinceLayout() {
    const size = this.measure()

    return (
      isSizeToLayOutAt(size) &&
      (size.width !== this.value.width || size.height !== this.value.height)
    )
  }

  /**
   * Whether the element has a size, measured as soon as you subscribe, then
   * each time a resize changes it, as when its container is hidden or shown.
   * Each subscriber observes the element with its own observer, whose first
   * report gives the size as it is then. It completes when the reader is
   * destroyed, at once for a subscriber that comes after.
   */
  public readonly isSized$: Observable<boolean> = defer(() =>
    this.isDestroyed
      ? EMPTY
      : observeResize(this.value.element).pipe(
          map(() => this.hasSize()),
          startWith(this.hasSize()),
          distinctUntilChanged(),
          takeUntil(this.destroy$),
        ),
  )

  private syncAbsoluteViewportCssVariables(layout: {
    width: number
    height: number
  }) {
    const { style } = this.value.element

    if (layout.width > 0) {
      setStylePropertyIfChanged(
        style,
        CSS_VAR_ABSOLUTE_VIEWPORT_WIDTH,
        `${layout.width}px`,
      )
    } else {
      removeStylePropertyIfPresent(style, CSS_VAR_ABSOLUTE_VIEWPORT_WIDTH)
    }

    if (layout.height > 0) {
      setStylePropertyIfChanged(
        style,
        CSS_VAR_ABSOLUTE_VIEWPORT_HEIGHT,
        `${layout.height}px`,
      )
    } else {
      removeStylePropertyIfPresent(style, CSS_VAR_ABSOLUTE_VIEWPORT_HEIGHT)
    }
  }

  /**
   * Measures the viewport for a reader layout, and decides from that size and
   * the `spreadMode` setting whether it shows a spread. The spine's layout pass
   * calls this first, while the element has a size, since everything it lays
   * out depends on the viewport's size. Nothing else should: the size recorded
   * here has to stay the one the items were laid out for, which is how a
   * resize is told apart from a report of the same size. It is one-way and
   * never requests a reader layout itself.
   */
  public layout() {
    const size = this.measure()
    const isSpread = this.wouldSpreadAt(size)

    this.syncAbsoluteViewportCssVariables(size)

    this.mergeCompare({
      ...size,
      isSpread,
      pageSize: {
        width: isSpread ? size.width / 2 : size.width,
        height: size.height,
      },
    })
    this.layoutSubject.next()
  }

  /**
   * Whether a viewport of this size would show two pages side by side, for
   * this book and the current `spreadMode` setting. It is the rule every
   * layout applies to the viewport's own size, so it tells what a rotation or
   * a resize would show before it happens. `isSpread` is what is shown now.
   */
  public wouldSpreadAt(size: { width: number; height: number }) {
    return shouldUseSpreadModeForViewport({
      spreadMode: this.settingsManager.values.spreadMode,
      manifest: this.context.manifest,
      viewport: size,
    })
  }

  public get absoluteViewport() {
    return new AbsoluteViewport({
      width: this.value.width,
      height: this.value.height,
    })
  }

  public get pageSize() {
    return this.value.pageSize
  }

  /**
   * The scale the viewport is rendered at, from its rendered width over its
   * layout width, both as they are now. The width recorded at the last layout
   * would count a resize that has not been laid out yet as part of the scale.
   */
  public get scaleFactor() {
    return this.getScaleOfRenderedBox(
      this.value.element.getBoundingClientRect(),
    )
  }

  /** The scale the element is rendered at, given its rendered box. */
  private getScaleOfRenderedBox(renderedBox: DOMRect | undefined) {
    const layoutWidth = this.value.element.clientWidth

    if (!layoutWidth) return 1

    // Fall back to no-zoom (`1`) when the rendered rect is unavailable
    // (detached element, `display: none`, jsdom). A 0-width rect would
    // otherwise yield a 0 scale and propagate `Infinity` through every
    // consumer that divides by `scaleFactor` (e.g. spine-coord clamping).
    const measuredWidth = renderedBox?.width || layoutWidth

    return measuredWidth / layoutWidth
  }

  /**
   * Returns the relative viewport after eventual transforms.
   * For example if the viewport was zoomed out, we start seeing more left and right
   * items. Therefore we can virtually expand the viewport.
   * Inversely if the viewport is zoomed in, we see less left and right items.
   *
   * This is mostly useful for detecting what should be visible, navigable, etc.
   * Where it is in the book: `getVisibleSlice()`.
   *
   * @important
   * Contains long floating values.
   */
  public get relativeViewport() {
    return this.getRelativeViewportAtScale(this.scaleFactor)
  }

  private getRelativeViewportAtScale(scale: number) {
    const absoluteViewport = this.absoluteViewport

    return new RelativeViewport({
      width: absoluteViewport.width / scale,
      height: absoluteViewport.height / scale,
    })
  }

  /**
   * The part of the spine the viewport shows while the book is at `position`,
   * the spine position at its top-left corner, where a navigation puts it:
   * paginated, the navigation moves the spine under the viewport, and
   * scrolled, it scrolls the viewport along the spine.
   *
   * Transformed, such as by a zoom, the viewport shows the relative viewport,
   * from wherever the transform takes its corner: a paginated zoom scales it
   * around its center, then `reader.zoom.move()` moves it, and a scrolled
   * zoom scales it from its top. That corner is measured on the page, against
   * the box the viewport is laid out in, the way the scale is. Not rendered,
   * it is the absolute viewport at the position.
   */
  public getVisibleSlice(position: SpinePosition | UnboundSpinePosition) {
    const { element } = this.value
    const renderedBox = element.getBoundingClientRect()
    const scale = this.getScaleOfRenderedBox(renderedBox)
    const { width, height } = this.getRelativeViewportAtScale(scale)
    const { offsetParent } = element

    if (!renderedBox.width || !offsetParent) {
      return ViewportSlicePosition.from({
        x: position.x,
        y: position.y,
        width,
        height,
      })
    }

    /**
     * Where the viewport's corner would be on the page untransformed: in the
     * box it is laid out in, scrolled with it, as a scrolled book is.
     */
    const layoutBox = offsetParent.getBoundingClientRect()
    const untransformedLeft =
      layoutBox.left +
      offsetParent.clientLeft +
      element.offsetLeft -
      offsetParent.scrollLeft
    const untransformedTop =
      layoutBox.top +
      offsetParent.clientTop +
      element.offsetTop -
      offsetParent.scrollTop

    return ViewportSlicePosition.from({
      x: position.x + (untransformedLeft - renderedBox.left) / scale,
      y: position.y + (untransformedTop - renderedBox.top) / scale,
      width,
      height,
    })
  }

  public destroy() {
    super.destroy()
    this.layoutSubject.complete()
    this.value.element.remove()
  }
}
