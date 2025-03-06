import { Observable } from "rxjs"

export const copyFrameStyles = (
  originalIframe: HTMLIFrameElement,
  clonedIframe: HTMLIFrameElement,
) => {
  return new Observable<void>((subscriber) => {
    const copyStyles = () => {
      try {
        // Check for cross-origin restrictions
        if (!originalIframe.contentDocument || !clonedIframe.contentDocument) {
          console.warn(
            "Cannot access iframe content document - possible cross-origin restriction",
          )

          subscriber.complete()

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

        subscriber.complete()
      } catch (e) {
        console.error("Error copying iframe styles:", e)

        subscriber.complete()
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
    if (clonedIframe.contentDocument?.readyState === "complete") {
      copyStyles()
    }

    return () => {
      clonedIframe.removeEventListener("load", loadHandler)
    }
  })
}
