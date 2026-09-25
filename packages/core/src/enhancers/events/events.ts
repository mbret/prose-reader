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
       * Pass the pointer events of the item's document through to the main
       * document, so gestures and selection see them on the root element.
       */
      const unregister = pointerEvents.map((event) => {
        const listener = (e: PointerEvent) => {
          reader.context.value.rootElement?.dispatchEvent(
            normalizeEventForViewport(e, reader.spine.locator),
          )
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

    reader.hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)
    })

    return reader
  }
