import { Report } from "../../report"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { CfiHandler } from "../CfiHandler"
import { parseCfi } from "./parseCfi"

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

  const { cleanedCfi, offset } = parseCfi(cfi)
  const cfiHandler = new CfiHandler(cleanedCfi, {})

  const rendererElement = spineItem.renderer.getDocumentFrame()

  if (rendererElement instanceof HTMLIFrameElement) {
    const doc = rendererElement.contentWindow?.document

    if (doc) {
      try {
        const { node, offset: resolvedOffset } = cfiHandler.resolve(doc, {})

        return {
          node,
          offset: offset ?? resolvedOffset,
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
