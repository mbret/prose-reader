import { Observable } from "rxjs"
import { redrawCanvas } from "./redrawCanvas"

export const redrawFrameCanvas = (
  originalIframe: HTMLIFrameElement,
  clonedIframe: HTMLIFrameElement,
) => {
  return new Observable((observer) => {
    const copyCanvases = () => {
      try {
        if (!originalIframe.contentDocument || !clonedIframe.contentDocument) {
          throw new Error("Iframe content document is not available")
        }

        const originalCanvasesInIframe =
          originalIframe.contentDocument.querySelectorAll("canvas")
        const clonedCanvasesInIframe =
          clonedIframe.contentDocument.querySelectorAll("canvas")

        originalCanvasesInIframe.forEach((originalCanvas, canvasIndex) => {
          if (canvasIndex < clonedCanvasesInIframe.length) {
            const clonedCanvas = clonedCanvasesInIframe[
              canvasIndex
            ] as HTMLCanvasElement

            redrawCanvas(originalCanvas, clonedCanvas)
          }
        })
      } catch (e) {
        console.error("Error copying iframe canvases:", e)
      }

      observer.complete()
    }

    // Store reference to the handler so we can remove it later
    const canvasLoadHandler = () => {
      copyCanvases()
      // Remove the event listener after it's been called to prevent memory leaks
      clonedIframe.removeEventListener("load", canvasLoadHandler)
    }

    // Add load event listener to copy canvases after iframe loads
    clonedIframe.addEventListener("load", canvasLoadHandler)

    // If the original iframe is already loaded, trigger the handler
    if (originalIframe.contentDocument?.readyState === "complete") {
      copyCanvases()
    }

    return () => {
      clonedIframe.removeEventListener("load", canvasLoadHandler)
    }
  })
}
