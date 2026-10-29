import { useEffect } from "react"

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
