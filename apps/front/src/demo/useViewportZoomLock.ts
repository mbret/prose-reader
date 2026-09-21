import { useEffect } from "react"

const LOCKED_VIEWPORT = `width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no`

/**
 * The reader owns its own gestures: a pinch scales the font and a double tap
 * turns the page, so letting the browser zoom on top of that fights it. It
 * would also strand the user, since index.css hides the overflow on html and
 * body and a zoomed page cannot be panned back.
 *
 * The demo used to state this in its own index.html. Now that it shares a
 * document with the landing page, which must stay zoomable, the lock lasts
 * only as long as the demo is mounted.
 */
export const useViewportZoomLock = () => {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      `meta[name="viewport"]`,
    )

    if (!meta) return

    const previousViewport = meta.content

    if (meta.content !== LOCKED_VIEWPORT) {
      meta.content = LOCKED_VIEWPORT
    }

    return () => {
      if (meta.content !== previousViewport) {
        meta.content = previousViewport
      }
    }
  }, [])
}
