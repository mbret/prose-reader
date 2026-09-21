import { useEffect } from "react"

/**
 * The demo used to be its own document with its own <title>. Sharing one with
 * the landing page means every demo page would otherwise claim to be "Prose",
 * so each screen names itself and hands the title back on the way out.
 */
export const useDocumentTitle = (title: string) => {
  useEffect(() => {
    const previousTitle = document.title

    if (document.title !== title) {
      document.title = title
    }

    return () => {
      if (document.title !== previousTitle) {
        document.title = previousTitle
      }
    }
  }, [title])
}
