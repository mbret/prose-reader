import {
  setPropertyIfChanged,
  setStylePropertyIfChanged,
} from "@prose-reader/core"
import { getHighlightBoxesOfRange } from "./getHighlightBoxesOfRange.ts"

export const createElementsForRange = (
  range: Range,
  container: HTMLElement,
  color: string,
) =>
  getHighlightBoxesOfRange(range).map(({ left, top, right, bottom }) => {
    const rectEltContainer = container.ownerDocument.createElement("div")
    const rectElt = container.ownerDocument.createElement("div")
    rectEltContainer.style.cssText = `
        position: absolute;
        width: ${right - left}px;
        height: ${bottom - top}px;
        top: ${top}px;
        left: ${left}px;
        box-sizing: border-box;
        border: 3px dashed transparent;
    `
    rectElt.style.cssText = `
        height: 100%;
        width: 100%;
        opacity: 40%;
        background-color: ${color}
    `

    rectEltContainer.appendChild(rectElt)

    return rectEltContainer
  })

export const copyPositionStyle = (source: HTMLElement, target: HTMLElement) => {
  setPropertyIfChanged(target.style, `cssText`, source.style.cssText)
}

export const createAnnotationLayer = (
  container: HTMLElement,
  layer: HTMLElement,
) => {
  const annotationLayer = container.ownerDocument.createElement("div")

  layoutAnnotationLayer(layer, annotationLayer)

  container.appendChild(annotationLayer)

  return annotationLayer
}

export const layoutAnnotationLayer = (
  layer: HTMLElement,
  annotationLayer: HTMLElement,
) => {
  copyPositionStyle(layer, annotationLayer)

  if (layer.style.position === "") {
    setStylePropertyIfChanged(annotationLayer.style, `position`, `absolute`)
    setStylePropertyIfChanged(annotationLayer.style, `top`, `0`)
  }

  //   annotationLayer.style.backgroundColor = "red"
  setStylePropertyIfChanged(annotationLayer.style, `opacity`, `1`)
  setStylePropertyIfChanged(annotationLayer.style, `pointer-events`, `none`)
}
