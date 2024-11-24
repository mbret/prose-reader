export const createPdfFrameElement = () => {
  const frame = document.createElement(`iframe`)
  frame.tabIndex = 0
  frame.style.cssText = `
    overflow: hidden;
    height: 100%;
    width: 100%;
    padding: 0px;
    position: absolute;
    left: 0;
    top: 0;
  `

  frame.setAttribute("frameBorder", "0")

  return frame
}

export const copyCanvasToFrame = (canvas: HTMLCanvasElement, frameDoc: Document) => {
  // Create a new canvas in the iframe
  const iframeCanvas = frameDoc.createElement("canvas")
  iframeCanvas.width = canvas.width
  iframeCanvas.height = canvas.height
  iframeCanvas.style.width = canvas.style.width
  iframeCanvas.style.height = canvas.style.height

  // Copy the content
  const ctx = iframeCanvas.getContext("2d")
  if (ctx) {
    ctx.drawImage(canvas, 0, 0)
  }

  frameDoc.body.appendChild(iframeCanvas)

  return iframeCanvas
}
