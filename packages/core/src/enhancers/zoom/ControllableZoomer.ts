import { BehaviorSubject } from "rxjs"
import { ZoomController } from "./ZoomController"

export class ControllableZoomer extends ZoomController {
  public element: HTMLDivElement | undefined
  public isZooming$ = new BehaviorSubject(false)
  public currentScale = 1
  public currentPosition = { x: 0, y: 0 }

  public enter(element?: HTMLImageElement): void {
    if (!element) {
      console.warn(`You need an image to enter zoom`)

      return
    }

    this.currentPosition = { x: 0, y: 0 }
    this.currentScale = 1

    const container = this.reader.context.value.rootElement

    if (container) {
      this.element = container.ownerDocument.createElement(`div`)
      /**
       * We use `user-select: none;` to prevent blue selection
       * flickering and because there are no point to select so far.
       */
      this.element.style.cssText = `
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

      this.element.appendChild(clonedImgElement)

      container.appendChild(this.element)

      this.isZooming$.next(true)
    }
  }

  public exit() {
    this.element?.remove()
    this.element = undefined
    this.currentPosition = { x: 0, y: 0 }
    this.currentScale = 1

    this.isZooming$.next(false)
  }

  public moveAt(position: { x: number; y: number }): void {
    const imgElement = this.element?.querySelector(`img`)

    imgElement?.style.setProperty(
      `transform`,
      `translate3d(${position.x}px, ${position.y}px, 0px) scale3d(${this.currentScale}, ${this.currentScale}, 1)`,
    )

    this.currentPosition = position
  }

  public scaleAt(userScale: number): void {
    const computedScale = Math.max(0.01, userScale)

    const imgElement = this.element?.querySelector(`img`)

    imgElement?.style.setProperty(
      `transform`,
      `translate3d(${this.currentPosition.x}px, ${this.currentPosition.y}px, 0px) scale3d(${computedScale}, ${computedScale}, 1)`,
    )

    this.currentScale = computedScale
  }
}
