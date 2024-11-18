export const copyPositionStyle = (source: HTMLElement, target: HTMLElement) => {
  target.style.cssText = source.style.cssText
}

export const createAnnotationLayer = (container: HTMLElement, layer: HTMLElement) => {
  const annotationLayer = container.ownerDocument.createElement("div")

  layoutAnnotationLayer(layer, annotationLayer)

  container.appendChild(annotationLayer)

  return annotationLayer
}

export const layoutAnnotationLayer = (layer: HTMLElement, annotationLayer: HTMLElement) => {
  copyPositionStyle(layer, annotationLayer)

  if (layer.style.position === "") {
    annotationLayer.style.position = "absolute"
    annotationLayer.style.top = "0"
  }

  annotationLayer.style.backgroundColor = "red"
  annotationLayer.style.opacity = "0.5"
  annotationLayer.style.pointerEvents = "none"
}
