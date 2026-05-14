import { isPointerEvent } from "../../utils/dom"
import type { EnhancerOutput, RootEnhancer } from "../types/enhancer"
import { normalizeEventForViewport } from "./normalizeEventForViewport"

const pointerEvents = [
  `pointercancel` as const,
  `pointerdown` as const,
  `pointerenter` as const,
  `pointerleave` as const,
  `pointermove` as const,
  `pointerout` as const,
  `pointerover` as const,
  `pointerup` as const,
]

const passthroughEvents = [...pointerEvents /*, ...mouseEvents*/]

export const eventsEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)
    const cleanupByItemId = new Map<string, () => void>()

    reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)

      const item = reader.spineItemsManager.get(itemId)

      const frame = item?.renderer.getDocumentFrame()

      if (!frame || !item) return

      /**
       * Register event listener for all mouse/pointer event in order to
       * passthrough events to main document
       */
      const unregister = passthroughEvents.map((event) => {
        const listener = (e: MouseEvent | PointerEvent | TouchEvent) => {
          let convertedEvent = e
          /**
           * We have to create a new fake event since the original one is already dispatched
           * on original frame.
           *
           * @see Failed to execute 'dispatchEvent' on 'EventTarget': The event is already being dispatched.
           */
          if (isPointerEvent(e)) {
            convertedEvent = new PointerEvent(e.type, e)
          }

          if (convertedEvent !== e) {
            const normalizedEvent = normalizeEventForViewport(
              convertedEvent,
              e,
              reader.spine.locator,
              reader.viewport,
            )

            reader.context.value.rootElement?.dispatchEvent(normalizedEvent)
          }
        }

        frame.contentDocument?.addEventListener(event, listener)

        return () => {
          frame.contentDocument?.removeEventListener(event, listener)
        }
      })

      const cleanup = () => {
        unregister.forEach((cb) => {
          cb()
        })
      }

      cleanupByItemId.set(itemId, cleanup)
    })

    reader.hookManager.register(`item.onDocumentUnload`, async ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)
    })

    return reader
  }
