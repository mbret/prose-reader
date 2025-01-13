import type { Context } from "../../context/Context"
import type { SpineLocator } from "../../spine/locator/SpineLocator"
import { isMouseEvent, isPointerEvent, isTouchEvent } from "../../utils/dom"
import { translateFramePositionIntoPage } from "./translateFramePositionIntoPage"

export const normalizeEventForViewport = <
  E extends MouseEvent | TouchEvent | PointerEvent,
>(
  event: E,
  iframeOriginalEvent: E,
  locator: SpineLocator,
  context: Context,
) => {
  const originalFrame = iframeOriginalEvent?.view?.frameElement

  if (!iframeOriginalEvent || !originalFrame) return event

  const spineItem = locator.getSpineItemFromIframe(originalFrame)
  const frameElement = originalFrame
  const { height: pageHeight, width: pageWidth } = context.getPageSize()

  if (!spineItem || !(frameElement instanceof HTMLIFrameElement)) return event

  if (isPointerEvent(event)) {
    const { clientX, clientY } = translateFramePositionIntoPage({
      position: event,
      frameElement,
      pageHeight,
      pageWidth,
    })

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
    const { clientX, clientY } = translateFramePositionIntoPage({
      position: event,
      frameElement,
      pageHeight,
      pageWidth,
    })

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
      const { clientX, clientY } = translateFramePositionIntoPage({
        position: touch,
        frameElement,
        pageHeight,
        pageWidth,
      })

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
