import { isHtmlElement } from "@prose-reader/core"
import type { GestureEvent } from "./types"

export const isNotLink = (event: GestureEvent["event"]) => {
  const target = event.event.target

  if (isHtmlElement(target) && target.tagName === "a") return false

  return true
}

export const getPositionRelativeToContainer = (
  event: { x: number; y: number },
  containerElementRect: DOMRectReadOnly,
) => {
  const { x, y } = event
  const { left, top } = containerElementRect

  return {
    x: x - left,
    y: y - top,
  }
}
