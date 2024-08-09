import { Report } from "../../report"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { CfiHandler } from "../CfiHandler"
import { extractProseMetadataFromCfi } from "./extractProseMetadataFromCfi"

/**
 * Returns the node and offset for the given cfi.
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
  const spineItemIndex = spineItemsManager.getSpineItemIndex(spineItem) || 0

  if (!spineItem) return undefined

  const { cleanedCfi, offset } = extractProseMetadataFromCfi(cfi)
  const cfiHandler = new CfiHandler(cleanedCfi, {})

  const doc =
    spineItem.frame.getManipulableFrame()?.frame?.contentWindow
      ?.document

  if (doc) {
    try {
      const { node, offset: resolvedOffset } = cfiHandler.resolve(doc, {})

      return { node, offset: offset ?? resolvedOffset, spineItemIndex }
    } catch (e) {
      Report.error(e)

      return {
        spineItemIndex,
      }
    }
  }

  return {
    spineItemIndex,
  }
}
