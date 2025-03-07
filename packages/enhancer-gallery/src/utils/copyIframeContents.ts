import { waitForFrameLoad } from "@prose-reader/core"
import { combineLatest, switchMap } from "rxjs"

import { of } from "rxjs"

export const copyIframeContents = (
  originalIframes: NodeListOf<HTMLIFrameElement>,
  clonedIframes: NodeListOf<HTMLIFrameElement>,
) => {
  return combineLatest(
    Array.from(originalIframes).map((originalIframe, index) => {
      const clonedIframe = clonedIframes[index]

      if (!clonedIframe) return of(true)

      return waitForFrameLoad(of(clonedIframe)).pipe(
        // delay(1000),
        switchMap(() => {
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
            }
            return of(true)
          } catch (e) {
            console.error("Error copying iframe content:", e)
            return of(false)
          }
        }),
      )
    }),
  )
}
