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

    reader.hookManager.register(
      `item.onDocumentLoad`,
      ({ destroy, itemId }) => {
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

        destroy(() => {
          unregister.forEach((cb) => {
            cb()
          })
        })
      },
    )

    return reader
  }
