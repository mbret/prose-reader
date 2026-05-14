import { waitForFrameLoad } from "@prose-reader/core"
import { combineLatest, defaultIfEmpty, from, of, switchMap } from "rxjs"
import { redrawCanvas } from "./redrawCanvas"
import {
  copyBlobAssetReferences,
  createSnapshotObjectUrlStore,
} from "./snapshotBlobAssets"

const copyIframeContents = (
  originalIframes: NodeListOf<HTMLIFrameElement>,
  clonedIframes: NodeListOf<HTMLIFrameElement>,
  objectUrlStore: ReturnType<typeof createSnapshotObjectUrlStore>,
) => {
  const iframeCopies = Array.from(originalIframes).map(
    (originalIframe, index) => {
      const clonedIframe = clonedIframes[index]

      if (!clonedIframe) return of(true)

      return waitForFrameLoad(of(clonedIframe)).pipe(
        switchMap(async () => {
          try {
            // Since we know they're same-origin EPUBs, we can directly copy content
            if (
              originalIframe.contentDocument &&
              clonedIframe.contentDocument
            ) {
              // Clone the entire body content
              const clonedBody =
                originalIframe.contentDocument.body.cloneNode(true)

              // Replace the body in the cloned iframe
              clonedIframe.contentDocument.body.replaceWith(clonedBody)

              // Also copy any head styles that might be important for rendering
              const originalHead = originalIframe.contentDocument.head
              const clonedHead = clonedIframe.contentDocument.head

              // Copy all style and link elements from head
              Array.from(
                originalHead.querySelectorAll('style, link[rel="stylesheet"]'),
              ).forEach((node) => {
                clonedHead.appendChild(node.cloneNode(true))
              })

              await copyBlobAssetReferences(
                clonedIframe.contentDocument,
                clonedIframe.contentDocument,
                objectUrlStore,
              )
            }
            return true
          } catch (e) {
            console.error("Error copying iframe content:", e)
            return false
          }
        }),
      )
    },
  )

  if (iframeCopies.length === 0) return of(true)

  return combineLatest(iframeCopies)
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

export function deepCloneElement(sourceElement: HTMLElement) {
  const objectUrlStore = createSnapshotObjectUrlStore()
  // Create a deep clone of the source element
  const clone = sourceElement.cloneNode(true) as HTMLElement

  // Find all iframes in the original element
  const originalIframes = sourceElement.querySelectorAll("iframe")
  // Find all iframes in the cloned element
  const clonedIframes = clone.querySelectorAll("iframe")

  // Handle canvases in the main document
  redrawCanvases(sourceElement, clone)

  const copyContents$ = combineLatest([
    from(
      copyBlobAssetReferences(
        clone,
        sourceElement.ownerDocument,
        objectUrlStore,
      ),
    ),
    copyIframeContents(originalIframes, clonedIframes, objectUrlStore),
  ])

  return {
    clone,
    ready$: copyContents$.pipe(defaultIfEmpty(true)),
    release: objectUrlStore.revokeAll,
  }
}
