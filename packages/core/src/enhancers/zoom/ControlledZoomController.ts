import { filter, switchMap, takeUntil, tap, timer } from "rxjs"
import type { Reader } from "../../reader"
import { ZoomController } from "./ZoomController"

/**
 * @important
 * Animation is not possible for scrolling mode because the animation
 * is based on transform origin and its impossible to have a correct
 * centered transform origin with the viewport in a scrollable container.
 * What we do is compute the "wanted" scroll position to make it look like
 * scale down/up appears centered.
 */
const ANIMATION_DURATION = 200

export class ControlledZoomController extends ZoomController {
  constructor(reader: Reader) {
    super(reader)

    this.watch("isZooming").pipe(
      filter((isZooming) => !isZooming),
      switchMap(() =>
        timer(ANIMATION_DURATION).pipe(
          tap(() => {
            this.reader.viewport.value.element.style.transition = ``
          }),
        ),
      ),
    )

    this.watch("currentScale")
      .pipe(
        switchMap(() =>
          timer(ANIMATION_DURATION).pipe(
            tap(() => {
              this.reader.layout()
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe()
  }

  public enter({
    element,
    scale = 1,
    animate,
  }: {
    element?: HTMLImageElement
    scale?: number
    animate?: boolean
  } = {}): void {
    const container = this.reader.context.value.rootElement
    const viewportElement = this.reader.viewport.value.element

    let _element: HTMLDivElement | undefined

    if (container && element) {
      _element = container.ownerDocument.createElement(`div`)
      /**
       * We use `user-select: none;` to prevent blue selection
       * flickering and because there are no point to select so far.
       */
      _element.style.cssText = `
          top: 0;
          left: 0;
          display: block;
          position: absolute;
          z-index: 1;
          background: black;
          width: 100%;
          height: 100%;
          user-select: none;
        `
      const clonedImgElement = element.cloneNode() as HTMLImageElement
      clonedImgElement.src = element.src
      clonedImgElement.style.setProperty(`height`, `100%`)
      clonedImgElement.style.setProperty(`width`, `100%`)
      clonedImgElement.style.setProperty(`object-fit`, `contain`)
      // convenient so that user does not trigger zoom again if for example he is listening to press
      // on img element. Any press event on the zoom container will not have the img as target.
      clonedImgElement.style.setProperty(`pointer-events`, `none`)

      _element.appendChild(clonedImgElement)

      container.appendChild(_element)
    }

    if (animate && !element) {
      viewportElement.style.transition = `transform ${ANIMATION_DURATION}ms`
    }

    this.setScale(scale)

    this.mergeCompare({
      element: _element,
      isZooming: true,
      currentScale: scale,
      currentPosition: { x: 0, y: 0 },
    })
  }

  public exit() {
    super.exit()

    const viewportElement = this.reader.viewport.value.element

    if (!this.value.element) {
      viewportElement.style.transformOrigin = ``
      viewportElement.style.transform = ``
    }

    this.value.element?.remove()

    this.mergeCompare({
      element: undefined,
      isZooming: false,
      currentScale: 1,
      currentPosition: { x: 0, y: 0 },
    })
  }

  public moveAt(position: { x: number; y: number }): void {
    const imgElement = this.value.element?.querySelector(`img`)

    imgElement?.style.setProperty(
      `transform`,
      `translate3d(${position.x}px, ${position.y}px, 0px) scale3d(${this.value.currentScale}, ${this.value.currentScale}, 1)`,
    )

    this.mergeCompare({
      currentPosition: position,
    })
  }

  protected setElementScale(element: HTMLDivElement, scale: number): void {
    const imgElement = element.querySelector(`img`)

    imgElement?.style.setProperty(
      `transform`,
      `translate3d(${this.value.currentPosition.x}px, ${this.value.currentPosition.y}px, 0px) scale3d(${scale}, ${scale}, 1)`,
    )
  }

  protected setViewportScale(scale: number): void {
    const viewportElement = this.reader.viewport.value.element

    viewportElement.style.transformOrigin = `center`
    viewportElement.style.transform = `scale(${scale})`
  }

  protected setScale(userScale: number): void {
    if (this.value.element) {
      this.setElementScale(this.value.element, userScale)
    } else {
      this.setViewportScale(userScale)
    }
  }

  public scaleAt(userScale: number): void {
    const computedScale = userScale

    this.setScale(computedScale)

    this.mergeCompare({
      currentScale: computedScale,
    })
  }
}
