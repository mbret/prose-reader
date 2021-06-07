import { Context } from "../context"
import { getOriginalFrameEventFromDocumentEvent } from "../frames"
import { ReadingItemManager } from "../readingItemManager"
import { isMouseEvent, isPointerEvent, isTouchEvent } from "../utils/dom"
import { createLocator } from "./locator"

export const createEventsHelper = ({ iframeEventBridgeElement, context, readingItemManager }: {
  iframeEventBridgeElement: HTMLElement,
  readingItemManager: ReadingItemManager,
  context: Context,
}) => {
  const locator = createLocator({ readingItemManager, context })

  const normalizeEvent = <E extends (MouseEvent | TouchEvent | PointerEvent)>(event: E) => {
    const eventIsComingFromBridge = event.target === iframeEventBridgeElement
    const iframeOriginalEvent = getOriginalFrameEventFromDocumentEvent(event)
    const originalFrame = iframeOriginalEvent?.view?.frameElement

    if (!eventIsComingFromBridge || !iframeOriginalEvent || !originalFrame) return event

    const readingItem = locator.getReadingItemFromIframe(originalFrame)

    if (!readingItem) return event

    if (isPointerEvent(event)) {
      const { x, y } = readingItem.translateFramePositionIntoPage({ x: event.clientX, y: event.clientY })

      return new PointerEvent(event.type, {
        ...event,
        clientX: x,
        clientY: y,
      }) as E;
    }

    if (isMouseEvent(event)) {
      const { x, y } = readingItem.translateFramePositionIntoPage({ x: event.clientX, y: event.clientY })

      return new MouseEvent(event.type, {
        ...event,
        clientX: x,
        clientY: y,
      }) as E;
    }

    if (isTouchEvent(event)) {
      const touches = Array.from(event.touches).map(
        (touch) => {
          const { x, y } = readingItem.translateFramePositionIntoPage({ x: touch.clientX, y: touch.clientY })

          return new Touch({
            identifier: touch.identifier,
            target: touch.target,
            clientX: x,
            clientY: y,
          })
        },
      )

      return new TouchEvent(event.type, {
        touches,
        changedTouches: touches,
        targetTouches: touches,
      })
    }

    return event
  }

  return {
    normalizeEvent
  }
}