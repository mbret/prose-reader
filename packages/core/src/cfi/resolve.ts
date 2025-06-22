import { resolve } from "@prose-reader/cfi"
import { Report } from "../report"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import { parseCfi } from "./parse"

/**
 * Returns the node and offset for the given cfi.
 *
 * A CFI can only resolve if the item is loaded.
 *
 * @important
 * This is up to you to resolve CFI at the right time. Trying to resolve a CFI to an invalid
 * document will raise a warning but not crash.
 */
export const resolveCfi = ({
  cfi,
  spineItemsManager,
}: {
  cfi: string
  spineItemsManager: SpineItemsManager
}) => {
  if (!cfi) return undefined

  const { itemIndex } = parseCfi(cfi)

  const spineItem = spineItemsManager.get(itemIndex)

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
          isRange: resolved.isRange,
          range: resolved.isRange ? resolved.node : undefined,
          offset: Array.isArray(resolved.offset)
            ? resolved.offset.at(-1)
            : resolved.offset,
          spineItem,
        }
      } catch (e) {
        Report.warn(`Error resolving cfi: ${cfi}.`)
        Report.warn(e)

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
