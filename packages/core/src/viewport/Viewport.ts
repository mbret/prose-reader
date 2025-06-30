import { merge, takeUntil, tap } from "rxjs"
import { HTML_PREFIX } from "../constants"
import type { Context } from "../context/Context"
import { ReactiveEntity } from "../utils/ReactiveEntity"
import { AbsoluteViewport, RelativeViewport } from "./types"

type State = {
  element: HTMLElement
  pageSize: {
    width: number
    height: number
  }
}

export class Viewport extends ReactiveEntity<State> {
  constructor(protected context: Context) {
    const element = document.createElement("div")

    element.style.cssText = `
        background-color: white;
        position: relative;
        -transform: scale(0.2);
        height: 100%;
        width: 100%;
    `
    element.className = `${HTML_PREFIX}-viewport`

    super({
      element,
      pageSize: {
        width: 1,
        height: 1,
      },
    })

    const updatePageSize$ = this.context.watch("visibleAreaRect").pipe(
      tap(() => {
        this.mergeCompare({
          pageSize: this.calculatePageSize(),
        })
      }),
    )

    merge(updatePageSize$).pipe(takeUntil(this.destroy$)).subscribe()
  }

  protected calculatePageSize() {
    const absoluteViewport = this.absoluteViewport
    const { isUsingSpreadMode } = this.context.state

    return {
      width: isUsingSpreadMode
        ? absoluteViewport.width / 2
        : absoluteViewport.width,
      height: absoluteViewport.height,
    }
  }

  public get absoluteViewport() {
    const absoluteViewport = this.context.state.visibleAreaRect

    return new AbsoluteViewport({
      width: absoluteViewport.width,
      height: absoluteViewport.height,
    })
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
    const viewportRect = this.value.element.getBoundingClientRect()
    const relativeScale =
      (viewportRect?.width ?? absoluteViewport.width) / absoluteViewport.width

    return new RelativeViewport({
      width: absoluteViewport.width / relativeScale,
      height: absoluteViewport.height / relativeScale,
    })
  }
}
