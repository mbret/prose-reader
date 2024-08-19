import { isHtmlElement } from "@prose-reader/core"
import { filter, Observable } from "rxjs"

export const filterNotLink = <Event extends { event: PointerEvent }>(stream: Observable<Event>) =>
  stream.pipe(
    filter((event) => {
      const target = event.event.target

      if (isHtmlElement(target) && target.tagName === "a") return false

      return true
    }),
  )
