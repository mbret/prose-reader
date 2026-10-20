import type { Page } from "@playwright/test"
import { getReader } from "./reader"

/**
 * Whether the exact position a cfi points to is inside the window, so a
 * restored page is judged by where the anchored character ended up rather
 * than by whichever element happens to contain it.
 */
export const isCfiPositionVisible = async (page: Page, cfi: string) =>
  (await getReader(page)).evaluate((reader, cfi) => {
    const { node, offset } = reader.cfi.resolveCfi({ cfi })

    if (!node) return "cfi did not resolve to a node"

    const frame = node.ownerDocument?.defaultView?.frameElement

    if (!frame || !node.ownerDocument) return "node is not inside a frame"

    const range = node.ownerDocument.createRange()

    if (node.nodeType === Node.TEXT_NODE) {
      const start = Math.min(offset ?? 0, node.textContent?.length ?? 0)
      range.setStart(node, start)
      range.setEnd(node, Math.min(start + 1, node.textContent?.length ?? 0))
    } else {
      range.selectNodeContents(node)
    }

    const rect = range.getBoundingClientRect()
    const frameRect = frame.getBoundingClientRect()
    const x = frameRect.left + rect.left
    const y = frameRect.top + rect.top

    return x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
  }, cfi)

/** Whether the start of an element of a spine item is inside the window. */
export const isElementStartOnScreen = async (
  page: Page,
  spineItemIndex: number,
  id: string,
) =>
  (await getReader(page)).evaluate(
    (reader, { spineItemIndex, id }) => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const element = spineItem?.loadedDocument?.getElementById(id)
      const frame = spineItem?.renderer.getDocumentFrame()

      if (!frame || !element) return `no #${id} in a loaded document`

      const rect = element.getBoundingClientRect()
      const frameRect = frame.getBoundingClientRect()
      const x = frameRect.left + rect.left
      const y = frameRect.top + rect.top

      return x >= 0 && x < window.innerWidth && y >= 0 && y < window.innerHeight
    },
    { spineItemIndex, id },
  )
