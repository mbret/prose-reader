import { isHtmlTagElement } from "@prose-reader/core"
import { useCallback } from "react"
import { useSubscribe } from "reactjrx"
import { useReader } from "../context/useReader"

export const useInterceptExternalLinks = () => {
  const reader = useReader()

  const interceptExternalLinks = useCallback(
    () =>
      reader?.links$.subscribe((event) => {
        if (event.type === "click" && isHtmlTagElement(event.target, "a")) {
          if (!event.target.href) return

          const url = new URL(event.target.href)

          if (window.location.host !== url.host) {
            const response = confirm(
              `You are going to be redirected to external link`,
            )

            if (response) {
              window.open(event.target.href, "__blank")
            }
          }
        }
      }),
    [reader],
  )

  useSubscribe(interceptExternalLinks)
}
