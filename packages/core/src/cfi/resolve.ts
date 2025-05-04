import { resolve } from "@prose-reader/cfi"
import { Report } from "../report"
import type { SpineItemsManager } from "../spine/SpineItemsManager"

/**
 * Returns the node and offset for the given cfi.
 *
 * A CFI can only resolve if the item is loaded.
 */
export const resolveCfi = ({
  cfi,
  spineItemsManager,
}: {
  cfi: string
  spineItemsManager: SpineItemsManager
}) => {
  if (!cfi) return undefined

  const spineItem = spineItemsManager.getSpineItemFromCfi(cfi)

  if (!spineItem) return undefined

  const rendererElement = spineItem.renderer.getDocumentFrame()

  if (rendererElement instanceof HTMLIFrameElement) {
    const doc = rendererElement.contentWindow?.document

    if (doc) {
      try {
        const resolved = resolve(cfi, doc, {
          throwOnError: true,
        })

        return {
          node: resolved.isRange
            ? resolved.node?.startContainer
            : resolved.node,
          offset: Array.isArray(resolved.offset)
            ? resolved.offset.at(-1)
            : resolved.offset,
          spineItem,
        }
      } catch (e) {
        Report.error(e)

        return {
          spineItem,
        }
      }
    }
  }

  return {
    spineItem,
  }
}
