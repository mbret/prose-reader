import { SpineLocator } from "../../spine/locator/SpineLocator"
import { isMouseEvent, isPointerEvent, isTouchEvent } from "../../utils/dom"

export const normalizeEventForViewport = <
  E extends MouseEvent | TouchEvent | PointerEvent,
>(
  event: E,
  iframeOriginalEvent: E,
  locator: SpineLocator,
) => {
  const originalFrame = iframeOriginalEvent?.view?.frameElement

  if (!iframeOriginalEvent || !originalFrame) return event

  const spineItem = locator.getSpineItemFromIframe(originalFrame)

  if (!spineItem) return event

  if (isPointerEvent(event)) {
    const { clientX, clientY } = spineItem.translateFramePositionIntoPage(event)

    const newEvent = new PointerEvent(event.type, {
      ...event,
      pointerId: event.pointerId,
      clientX,
      clientY,
    }) as E

    Object.defineProperty(newEvent, `target`, {
      value: iframeOriginalEvent.target,
      enumerable: true,
    })

    return newEvent
  }

  if (isMouseEvent(event)) {
    const { clientX, clientY } = spineItem.translateFramePositionIntoPage(event)

    const newEvent = new MouseEvent(event.type, {
      ...event,
      clientX,
      clientY,
    }) as E

    Object.defineProperty(newEvent, `target`, {
      value: iframeOriginalEvent.target,
      enumerable: true,
    })

    return newEvent
  }

  if (isTouchEvent(event)) {
    const touches = Array.from(event.touches).map((touch) => {
      const { clientX, clientY } =
        spineItem.translateFramePositionIntoPage(touch)

      return new Touch({
        identifier: touch.identifier,
        target: touch.target,
        clientX,
        clientY,
      })
    })

    const newEvent = new TouchEvent(event.type, {
      touches,
      changedTouches: touches,
      targetTouches: touches,
    }) as E

    Object.defineProperty(newEvent, `target`, {
      value: iframeOriginalEvent.target,
      enumerable: true,
    })

    return newEvent
  }

  return event
}
