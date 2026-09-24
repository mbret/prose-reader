import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { isHtmlTagElement } from "../../utils/dom"
import { translateFramePositionIntoPage } from "./translateFramePositionIntoPage"

/**
 * What a copy of a pointer event needs to describe the same input: the pointer,
 * its buttons, how it pressed and which modifier keys were held. An event's
 * fields are getters on its prototype, so spreading one copies none of them,
 * and a right click would arrive as a left one.
 *
 * `bubbles`, `cancelable` and `composed` keep their defaults: the copy is for
 * the listeners on the reader's root element, and does not travel on to the
 * host document.
 */
const describeInput = (event: PointerEvent): PointerEventInit => ({
  pointerId: event.pointerId,
  pointerType: event.pointerType,
  isPrimary: event.isPrimary,
  button: event.button,
  buttons: event.buttons,
  width: event.width,
  height: event.height,
  pressure: event.pressure,
  tangentialPressure: event.tangentialPressure,
  tiltX: event.tiltX,
  tiltY: event.tiltY,
  twist: event.twist,
  altKey: event.altKey,
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,
  screenX: event.screenX,
  screenY: event.screenY,
  movementX: event.movementX,
  movementY: event.movementY,
  detail: event.detail,
})

/**
 * A copy of a pointer event from a spine item's frame, for the reader's root
 * element: the same input, at its position in the viewport, targeting the
 * element it happened on in the frame. A new event is needed either way, since
 * the original is still being dispatched in the frame.
 */
export const normalizeEventForViewport = (
  event: PointerEvent,
  locator: SpineLocator,
) => {
  const frameElement = event.view?.frameElement
  const { clientX, clientY } =
    isHtmlTagElement(frameElement, "iframe") &&
    locator.getSpineItemFromIframe(frameElement)
      ? translateFramePositionIntoPage({ position: event, frameElement })
      : event

  const normalizedEvent = new PointerEvent(event.type, {
    ...describeInput(event),
    clientX,
    clientY,
  })

  Object.defineProperty(normalizedEvent, `target`, {
    value: event.target,
    enumerable: true,
  })

  return normalizedEvent
}
