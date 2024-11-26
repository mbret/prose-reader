export const createElementForRange = (range: Range, container: HTMLElement, color: string) => {
  // Get all rects and group them by line (based on vertical position)
  const rects = Array.from(range.getClientRects())
  const lineGroups = new Map<number, DOMRect[]>()

  rects.forEach((rect) => {
    const lineY = Math.round(rect.top) // Round to handle minor pixel differences
    if (!lineGroups.has(lineY)) {
      lineGroups.set(lineY, [])
    }
    lineGroups.get(lineY)?.push(rect)
  })

  // Create one highlight element per line
  return Array.from(lineGroups.values()).map((lineRects) => {
    // Find the leftmost and rightmost points
    const left = Math.min(...lineRects.map((r) => r.left))
    const right = Math.max(...lineRects.map((r) => r.right))
    const top = lineRects[0]?.top
    const height = lineRects[0]?.height

    const rectEltContainer = container.ownerDocument.createElement("div")
    const rectElt = container.ownerDocument.createElement("div")
    rectEltContainer.style.cssText = `
        position: absolute;
        width: ${right - left}px;
        height: ${height}px;
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
}

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

  //   annotationLayer.style.backgroundColor = "red"
  annotationLayer.style.opacity = "1"
  annotationLayer.style.pointerEvents = "none"
}
