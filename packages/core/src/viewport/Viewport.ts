import { merge, Subject, takeUntil, tap } from "rxjs"
import {
  CSS_VAR_ABSOLUTE_VIEWPORT_HEIGHT,
  CSS_VAR_ABSOLUTE_VIEWPORT_WIDTH,
  HTML_PREFIX_VIEWPORT,
} from "../constants"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import {
  removeStylePropertyIfPresent,
  setStylePropertyIfChanged,
} from "../utils/dom"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { AbsoluteViewport, RelativeViewport } from "./types"

type State = {
  element: HTMLElement
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

export class Viewport extends ReactiveEntity<State> {
  private layoutSubject = new Subject<void>()
  public readonly layout$ = this.layoutSubject.asObservable()

  constructor(
    protected context: Context,
    protected settingsManager: ReaderSettingsManager,
  ) {
    const element = document.createElement("div")

    element.setAttribute(`data-${HTML_PREFIX_VIEWPORT}`, "")

    super({
      element,
      pageSize: {
        width: 1,
        height: 1,
      },
      width: 1,
      height: 1,
    })

    const updatePageSize$ = this.settingsManager
      .watch(["computedSpreadMode"])
      .pipe(
        tap(() => {
          this.mergeCompare({
            pageSize: this.calculatePageSize(this.value),
          })
        }),
      )

    const updateLayout$ = this.context.watch("rootElement").pipe(
      tap(() => {
        this.layout()
      }),
    )

    merge(updatePageSize$, updateLayout$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  protected calculatePageSize(layout: { width: number; height: number }) {
    const { computedSpreadMode } = this.settingsManager.values

    const pageSize = {
      width: computedSpreadMode ? layout.width / 2 : layout.width,
      height: layout.height,
    }

    return pageSize
  }

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
   * Re-measure the viewport and notify viewport-geometry dependents.
   *
   * This is the lighter sub-layout used when the viewport's visual mapping may
   * have changed while spine geometry is still valid (for example after a CSS
   * transform/scale). `reader.layout()` calls this before `spine.layout()`
   * because spine/page layout depends on the viewport size. This method should
   * stay one-way and must not trigger a full reader layout by itself.
   */
  public layout() {
    const layout = {
      width: this.value.element.clientWidth,
      height: this.value.element.clientHeight,
    }

    this.syncAbsoluteViewportCssVariables(layout)

    this.mergeCompare({
      pageSize: this.calculatePageSize(layout),
      ...layout,
    })
    this.layoutSubject.next()
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

  public get scaleFactor() {
    const absoluteViewport = this.absoluteViewport

    if (!absoluteViewport.width) return 1

    const viewportRect = this.value.element.getBoundingClientRect()
    // Fall back to no-zoom (`1`) when the rendered rect is unavailable
    // (detached element, `display: none`, jsdom). A 0-width rect would
    // otherwise yield a 0 scale and propagate `Infinity` through every
    // consumer that divides by `scaleFactor` (e.g. spine-coord clamping).
    const measuredWidth = viewportRect?.width || absoluteViewport.width

    return measuredWidth / absoluteViewport.width
  }

  /**
   * Returns the relative viewport after eventual transforms.
   * For example if the viewport was zoomed out, we start seeing more left and right
   * items. Therefore we can virtually expand the viewport.
   * Inversely if the viewport is zoomed in, we see less left and right items.
   *
   * This is mostly useful for detecting what should be visible, navigable, etc.
   *
   * @important
   * Contains long floating values.
   *
   * @todo take position of translate into consideration in something
   * like relativeViewportPosition or even better a ViewportSlicePosition
   */
  public get relativeViewport() {
    const absoluteViewport = this.absoluteViewport
    const relativeScale = this.scaleFactor

    return new RelativeViewport({
      width: absoluteViewport.width / relativeScale,
      height: absoluteViewport.height / relativeScale,
    })
  }

  public destroy() {
    super.destroy()
    this.layoutSubject.complete()
  }
}
