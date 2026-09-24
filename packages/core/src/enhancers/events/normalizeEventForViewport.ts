import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { isHtmlTagElement } from "../../utils/dom"
import { translateFramePositionIntoPage } from "./translateFramePositionIntoPage"

/**
 * A copy of a pointer event from a spine item's frame, for the reader's root
 * element, at its position in the viewport and targeting the element it
 * happened on in the frame. A new event is needed either way, since the
 * original is still being dispatched in the frame.
 */
export const normalizeEventForViewport = (
  event: PointerEvent,
  locator: SpineLocator,
) => {
  const frameElement = event.view?.frameElement

  if (
    !isHtmlTagElement(frameElement, "iframe") ||
    !locator.getSpineItemFromIframe(frameElement)
  ) {
    return new PointerEvent(event.type, event)
  }

  const { clientX, clientY } = translateFramePositionIntoPage({
    position: event,
    frameElement,
  })

  /**
   * An event's fields are getters on its prototype, so spreading one copies
   * none of them: this copy carries its pointer id and position, and every
   * other field at its default, a left button among them (#240).
   */
  const normalizedEvent = new PointerEvent(event.type, {
    ...event,
    pointerId: event.pointerId,
    clientX,
    clientY,
  })

  Object.defineProperty(normalizedEvent, `target`, {
    value: event.target,
    enumerable: true,
  })

  return normalizedEvent
}
