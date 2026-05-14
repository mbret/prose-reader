import { upsertCSSToFrame } from "../utils/frames"
import type { EnhancerOutput, RootEnhancer } from "./types/enhancer"

/**
 *
 */
export const accessibilityEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(
    next: (options: InheritOptions) => InheritOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.removeAttribute(`tab-index`)
        } else {
          entry.target.setAttribute(`tab-index`, `-1`)
        }
      })
    }, {})

    const cleanupByItemId = new Map<string, () => void>()

    reader.hookManager.register(`item.onDocumentLoad`, async ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)

      const item = reader.spineItemsManager.get(itemId)

      if (!item) return

      const frame = item.renderer.getDocumentFrame()

      if (!frame) return

      upsertCSSToFrame(
        frame,
        `prose-reader-accessibility`,
        `
              :focus-visible {
                ${
                  /*
                  Some epubs remove the outline, this is not good practice since it reduce accessibility.
                  We will try to restore it by force.
                */ ``
                }
                outline: -webkit-focus-ring-color auto 1px;
              }
            `,
      )

      const links = frame.contentDocument?.body.querySelectorAll(`a`)

      links?.forEach((link) => {
        observer.observe(link)
      })

      const cleanup = () => {
        links?.forEach((link) => {
          observer.unobserve(link)
        })
      }

      cleanupByItemId.set(itemId, cleanup)
    })

    reader.hookManager.register(`item.onDocumentUnload`, async ({ itemId }) => {
      cleanupByItemId.get(itemId)?.()
      cleanupByItemId.delete(itemId)
    })

    return {
      ...reader,
    }
  }
