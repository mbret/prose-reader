import { isHtmlElement } from "@prose-reader/core"
import type { GestureEvent } from "./types"

export const isNotLink = (event: GestureEvent["event"]) => {
  const target = event.event.target

  if (isHtmlElement(target) && target.tagName === "a") return false

  return true
}

export const istMatchingSelectors = (
  selectors: string[],
  event: GestureEvent["event"],
): boolean => {
  const target = event.event.target

  if (!isHtmlElement(target)) return false

  const match = selectors.find((selector) => {
    // Check if the target matches the selector directly
    if (target.matches(selector)) return true

    // Check if the target is within an element matching the selector
    if (target.closest(selector)) return true

    return false
  })

  return !!match
}
