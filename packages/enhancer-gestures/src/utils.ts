import { GestureEvent } from "./types"
import { isHtmlElement } from "@prose-reader/core"

export const isNotLink = (event: GestureEvent) => {
  const target = event.event.target

  if (isHtmlElement(target) && target.tagName === "a") return false

  return true
}
