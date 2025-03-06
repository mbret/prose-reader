import { waitForFrameLoad } from "@prose-reader/core"
import { EMPTY, combineLatest, defaultIfEmpty, of, switchMap } from "rxjs"
import { copyFrameStyles } from "./copyFrameStyle"
import { redrawCanvas } from "./redrawCanvas"

const copyFramesStyles = (
  originalIframes: NodeListOf<HTMLIFrameElement>,
  clonedIframes: NodeListOf<HTMLIFrameElement>,
) => {
  return combineLatest(
    Array.from(originalIframes).map((originalIframe, index) => {
      const clonedIframe = clonedIframes[index]

      if (!clonedIframe) return of(true)

      return waitForFrameLoad(of(clonedIframe)).pipe(
        switchMap(() => copyFrameStyles(originalIframe, clonedIframe)),
      )
    }),
  )
}

const redrawCanvases = (sourceElement: HTMLElement, clone: HTMLElement) => {
  const originalCanvases = sourceElement.querySelectorAll("canvas")
  const clonedCanvases = clone.querySelectorAll("canvas")

  originalCanvases.forEach((originalCanvas, index) => {
    if (index < clonedCanvases.length) {
      const clonedCanvas = clonedCanvases[index] as HTMLCanvasElement

      redrawCanvas(originalCanvas, clonedCanvas)
    }
  })
}

// const redrawCanvasesInIframes = (
//   sourceElement: HTMLElement,
//   clone: HTMLElement,
// ) => {
//   const originalIframes = sourceElement.querySelectorAll("iframe")
//   const clonedIframes = clone.querySelectorAll("iframe")

//   return combineLatest(
//     Array.from(originalIframes).map((originalIframe, index) => {
//       const clonedIframe = clonedIframes[index]

//       if (!clonedIframe) return EMPTY

//       return waitForFrameLoad(of(clonedIframe)).pipe(
//         switchMap(() => redrawFrameCanvas(originalIframe, clonedIframe)),
//       )
//     }),
//   )
// }

export function deepCloneElement(sourceElement: HTMLElement) {
  // Create a deep clone of the source element
  const clone = sourceElement.cloneNode(true) as HTMLElement

  // Find all iframes in the original element
  const originalIframes = sourceElement.querySelectorAll("iframe")
  // Find all iframes in the cloned element
  const clonedIframes = clone.querySelectorAll("iframe")

  // Process each iframe
  const copyStyles$ = copyFramesStyles(originalIframes, clonedIframes)

  // Handle canvases in the main document
  redrawCanvases(sourceElement, clone)

  // Also handle canvases inside iframes
  // const redrawCanvasFrames$ = redrawCanvasesInIframes(sourceElement, clone)
  // for now we dont have iframes with canvas that cannot be loaded normally
  const redrawCanvasFrames$ = EMPTY

  return {
    clone,
    ready$: combineLatest([copyStyles$, redrawCanvasFrames$]).pipe(
      defaultIfEmpty(true),
    ),
  }
}
