import { BehaviorSubject } from "rxjs"
import { Reader } from "../../reader"

export const createElementZoomer = (reader: Reader) => {
  const isZooming$ = new BehaviorSubject<boolean>(false)
  let imageMagnifierContainer: HTMLDivElement | undefined
  let imgLastPosition: { x: number; y: number } = { x: 0, y: 0 }
  let movingLastDelta: { x: number; y: number } | undefined = { x: 0, y: 0 }
  // we use this value to compare with given scale. This allow user to keep scaling normally
  // even when doing several pinching one after another
  let baseScale = 1
  let lastUserScale = 1

  const enter = (imgElement: HTMLImageElement) => {
    isZooming$.next(true)

    imgLastPosition = { x: 0, y: 0 }
    baseScale = 1
    lastUserScale = 1

    const container = reader.context.state.containerElement

    if (container) {
      imageMagnifierContainer = container.ownerDocument.createElement(`div`)
      /**
       * We use `user-select: none;` to prevent blue selection
       * flickering and because there are no point to select so far.
       */
      imageMagnifierContainer.style.cssText = `
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
      const clonedImgElement = imgElement.cloneNode() as HTMLImageElement
      clonedImgElement.src = imgElement.src
      clonedImgElement.style.setProperty(`height`, `100%`)
      clonedImgElement.style.setProperty(`width`, `100%`)
      clonedImgElement.style.setProperty(`object-fit`, `contain`)
      // convenient so that user does not trigger zoom again if for example he is listening to press
      // on img element. Any press event on the zoom container will not have the img as target.
      clonedImgElement.style.setProperty(`pointer-events`, `none`)

      imageMagnifierContainer.appendChild(clonedImgElement)
      container.appendChild(imageMagnifierContainer)
    }

    scale(1.2)
    setCurrentScaleAsBase()
  }

  const setCurrentScaleAsBase = () => {
    baseScale = lastUserScale
  }

  const scale = (userScale: number) => {
    const imgElement = imageMagnifierContainer?.querySelector(`img`)

    // const userScaleScaledToLastValue = userScale * lastUserScale

    const roundedScale =
      Math.ceil(
        (userScale < 1
          ? baseScale - (1 - userScale)
          : baseScale + (userScale - 1)) * 100,
      ) / 100

    // const userScaleScaledToLastValue = userScale * lastUserScale

    const newScale = Math.max(roundedScale, 1)

    // console.log({ userScale, lastUserScale, userScaleScaledToLastValue, roundedScale })

    // if user zoom out that much, we reset img position
    if (roundedScale < 1) {
      imgLastPosition = { x: 0, y: 0 }
    }

    imgElement?.style.setProperty(
      `transform`,
      `translate3d(${imgLastPosition.x}px, ${imgLastPosition.y}px, 0px) scale3d(${newScale}, ${newScale}, 1)`,
    )

    lastUserScale = newScale
  }

  const move = (
    delta: { x: number; y: number } | undefined,
    { isFirst, isLast }: { isFirst: boolean; isLast: boolean },
  ) => {
    const imgElement = imageMagnifierContainer?.querySelector(`img`)

    if (isFirst) {
      movingLastDelta = delta
    }

    if (delta) {
      const newOffsetX = delta.x - (movingLastDelta?.x || 0)
      const newOffsetY = delta.y - (movingLastDelta?.y || 0)

      imgLastPosition = {
        x: imgLastPosition.x + newOffsetX,
        y: imgLastPosition.y + newOffsetY,
      }

      imgElement?.style.setProperty(
        `transform`,
        `translate3d(${imgLastPosition.x}px, ${imgLastPosition.y}px, 0px) scale3d(${baseScale}, ${baseScale}, 1)`,
      )

      movingLastDelta = delta
    }

    if (isLast) {
      movingLastDelta = undefined
    }
  }

  const exit = () => {
    lastUserScale = 1

    imageMagnifierContainer?.remove()
    imageMagnifierContainer = undefined

    isZooming$.next(false)
  }

  const _isZooming = () => isZooming$.value

  const destroy = () => {
    imageMagnifierContainer?.remove()
    imageMagnifierContainer = undefined
    isZooming$.complete()
  }

  return {
    enter,
    exit,
    move,
    scale,
    setCurrentScaleAsBase,
    getScaleValue: () => lastUserScale,
    isZooming: _isZooming,
    destroy,
    isZooming$: isZooming$.asObservable(),
  }
}
