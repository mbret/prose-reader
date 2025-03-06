export const redrawCanvas = (
  originalCanvas: HTMLCanvasElement,
  clonedCanvas: HTMLCanvasElement,
) => {
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
