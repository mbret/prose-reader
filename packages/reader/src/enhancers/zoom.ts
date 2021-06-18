import { Enhancer } from "../createReader";

const SHOULD_NOT_LAYOUT = false

/**
 *
 */
export const zoomEnhancer: Enhancer<{
  zoom: {
    enter: (imgElement: HTMLImageElement) => void
    exit: () => void,
    move: (position: { x: number, y: number } | undefined, details: { isFirst: boolean, isLast: boolean }) => void,
    isEnabled: () => boolean,
    scale: (scale: number) => void,
  }
}> = (next) => (options) => {
  const reader = next(options)
  let imageMagnifierContainer: HTMLDivElement | undefined = undefined
  let imgLastPosition: { x: number, y: number } = { x: 0, y: 0 }
  let movingLastDelta: { x: number, y: number } | undefined = { x: 0, y: 0 }
  let lastScale = 1

  const enter = (imgElement: HTMLImageElement) => {
    reader.manipulateContainer((container) => {
      imageMagnifierContainer = container.ownerDocument.createElement(`div`)
      imageMagnifierContainer.style.cssText = `
        top: 0;
        left: 0;
        display: block;
        position: absolute;
        z-index: 1;
        background: black;
        width: 100%;
        height: 100%;
      `
      const clonedImgElement = imgElement.cloneNode() as HTMLImageElement
      clonedImgElement.src = imgElement.src
      clonedImgElement.style.setProperty(`height`, `100%`)
      clonedImgElement.style.setProperty(`width`, `100%`)
      clonedImgElement.style.setProperty(`object-fit`, `contain`)

      imageMagnifierContainer.appendChild(clonedImgElement)
      container.appendChild(imageMagnifierContainer)

      imgLastPosition = { x: 0, y: 0 }
      lastScale = 1

      return SHOULD_NOT_LAYOUT
    })
  }

  const exit = () => {
    reader.manipulateContainer(() => {
      imageMagnifierContainer?.remove()
      imageMagnifierContainer = undefined

      return SHOULD_NOT_LAYOUT
    })
  }

  const move = (delta: { x: number, y: number } | undefined, { isFirst, isLast }: { isFirst: boolean, isLast: boolean }) => {
    const imgElement = imageMagnifierContainer?.querySelector(`img`)

    if (isFirst) {
      movingLastDelta = { x: 0, y: 0 }
    }

    if (delta) {
      const correctedX = delta.x - (movingLastDelta?.x || 0)
      const correctedY = delta.y - (movingLastDelta?.y || 0)

      imgLastPosition = { x: imgLastPosition.x + correctedX, y: imgLastPosition.y + correctedY }

      imgElement?.style.setProperty(`transform`, `translate3d(${imgLastPosition.x}px, ${imgLastPosition.y}px, 0px) scale3d(${lastScale}, ${lastScale}, 1)`)

      movingLastDelta = delta
    }

    if (isLast) {
      movingLastDelta = undefined
    }
  }

  const scale = (scale: number) => {
    const imgElement = imageMagnifierContainer?.querySelector(`img`)
    const roundedScale = Math.ceil(scale * 100) / 100
    const newScale = Math.max(roundedScale, 1)

    // if user zoom out that much, we reset img position
    if (roundedScale < 1) {
      imgLastPosition = { x: 0, y: 0 }
    }

    imgElement?.style.setProperty(`transform`, `translate3d(${imgLastPosition.x}px, ${imgLastPosition.y}px, 0px) scale3d(${newScale}, ${newScale}, 1)`)
    lastScale = newScale
  }

  const isEnabled = () => !!imageMagnifierContainer

  const destroy = () => {
    imageMagnifierContainer?.remove()
    imageMagnifierContainer = undefined
    reader.destroy()
  }

  return {
    ...reader,
    destroy,
    zoom: {
      enter,
      exit,
      move,
      isEnabled,
      scale,
    }
  }
}