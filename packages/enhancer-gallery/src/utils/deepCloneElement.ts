export function deepCloneElement(sourceElement: HTMLElement) {
  // Create a deep clone of the source element
  const clone = sourceElement.cloneNode(true) as HTMLElement

  // Find all iframes in the original element
  const originalIframes = sourceElement.querySelectorAll("iframe")
  // Find all iframes in the cloned element
  const clonedIframes = clone.querySelectorAll("iframe")

  // Process each iframe
  originalIframes.forEach((originalIframe, index) => {
    const clonedIframe = clonedIframes[index]

    if (!clonedIframe) return

    const copyStyles = () => {
      try {
        // Check for cross-origin restrictions
        if (!originalIframe.contentDocument || !clonedIframe.contentDocument) {
          console.warn(
            "Cannot access iframe content document - possible cross-origin restriction",
          )
          return
        }

        // Copy all stylesheets from original iframe to cloned iframe
        const originalStylesheets =
          originalIframe.contentDocument.querySelectorAll(
            'link[rel="stylesheet"], style',
          )

        originalStylesheets.forEach((stylesheet) => {
          const stylesheetClone = stylesheet.cloneNode(true)
          clonedIframe.contentDocument?.head.appendChild(stylesheetClone)
        })
      } catch (e) {
        console.error("Error copying iframe styles:", e)
      }
    }

    // Store reference to the handler so we can remove it later
    const loadHandler = () => {
      copyStyles()
      // Remove the event listener after it's been called to prevent memory leaks
      clonedIframe.removeEventListener("load", loadHandler)
    }

    // Add load event listener to the cloned iframe
    clonedIframe.addEventListener("load", loadHandler)

    // If the original iframe is already loaded, trigger the handler
    if (originalIframe.contentDocument?.readyState === "complete") {
      copyStyles()
    }
  })

  // Handle canvases in the main document
  const originalCanvases = sourceElement.querySelectorAll("canvas")
  const clonedCanvases = clone.querySelectorAll("canvas")

  originalCanvases.forEach((originalCanvas, index) => {
    if (index < clonedCanvases.length) {
      const clonedCanvas = clonedCanvases[index] as HTMLCanvasElement

      try {
        // Copy canvas dimensions
        clonedCanvas.width = originalCanvas.width
        clonedCanvas.height = originalCanvas.height

        // Copy canvas content
        const context = clonedCanvas.getContext("2d")
        if (context) {
          context.drawImage(originalCanvas, 0, 0)
        }
      } catch (e) {
        console.warn(
          "Could not copy canvas content - possible tainted canvas or cross-origin issue",
          e,
        )
      }
    }
  })

  // Also handle canvases inside iframes
  originalIframes.forEach((originalIframe, index) => {
    const clonedIframe = clonedIframes[index]

    if (!clonedIframe) return

    const copyCanvases = () => {
      try {
        if (!originalIframe.contentDocument || !clonedIframe.contentDocument) {
          return
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

            try {
              // Copy canvas dimensions
              clonedCanvas.width = originalCanvas.width
              clonedCanvas.height = originalCanvas.height

              // Copy canvas content
              const context = clonedCanvas.getContext("2d")
              if (context) {
                context.drawImage(originalCanvas, 0, 0)
              }
            } catch (canvasError) {
              console.warn("Could not copy iframe canvas content", canvasError)
            }
          }
        })
      } catch (e) {
        console.error("Error copying iframe canvases:", e)
      }
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
  })

  return clone
}
