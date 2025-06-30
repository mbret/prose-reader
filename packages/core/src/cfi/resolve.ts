import { resolve } from "@prose-reader/cfi"
import { Report } from "../report"
import type { SpineItemsManager } from "../spine/SpineItemsManager"
import type { SpineItem } from "../spineItem/SpineItem"
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
}): Omit<ReturnType<typeof parseCfi>, "offset"> & {
  offset?: number | undefined
  node: Node | null
  range?: Range | null
  spineItem?: SpineItem
} => {
  const { itemIndex, ...restParsed } = parseCfi(cfi)

  const spineItem = spineItemsManager.get(itemIndex)

  if (!spineItem)
    return {
      ...restParsed,
      itemIndex,
      node: null,
    }

  const rendererElement = spineItem.renderer.getDocumentFrame()

  if (rendererElement instanceof HTMLIFrameElement) {
    const doc = rendererElement.contentWindow?.document

    if (doc) {
      try {
        const resolved = resolve(cfi, doc, {
          throwOnError: true,
        })

        return {
          ...restParsed,
          itemIndex,
          node: resolved.isRange
            ? (resolved.node?.startContainer ?? null)
            : (resolved.node ?? null),
          isCfiRange: resolved.isRange,
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
          ...restParsed,
          spineItem,
          itemIndex,
          node: null,
        }
      }
    }
  }

  return {
    ...restParsed,
    itemIndex,
    spineItem,
    node: null,
  }
}
