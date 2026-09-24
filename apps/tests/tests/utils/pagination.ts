import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

/**
 * The reader's result has settled, and it was laid out for the size the
 * viewport has now. Awaited on the line after an action, it waits for that
 * action's own result:
 *
 * - a navigation, or a settings update that lays out, withdraws the current
 *   result before the call that makes it returns;
 * - a resize reaches the reader later, once its resize observer fires, but the
 *   viewport already has its new size, so the layout it was given no longer
 *   matches until the reader has laid out again. A layout withdraws the result
 *   before it measures the viewport.
 */
export const waitForSettled = (page: Page) =>
  page.waitForFunction(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader | undefined

    return (
      reader?.pagination.state.isSettled === true &&
      !reader.viewport.hasResizedSinceLayout()
    )
  })

/**
 * Updates the reader's settings. It does not wait: follow it with
 * `waitForSettled` when the update lays out.
 */
export const updateSettings = (
  page: Page,
  // functions cannot be sent into the page
  settings: Omit<
    Parameters<Reader["settings"]["update"]>[0],
    "getResource" | "getRenderer"
  >,
) =>
  page.evaluate((settings) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.settings.update(settings)
  }, settings)

/**
 * Whether the exact position a cfi points to is inside the window, so a
 * restored page is judged by where the anchored character ended up rather
 * than by whichever element happens to contain it.
 */
export const isCfiPositionVisible = (page: Page, cfi: string) =>
  page.evaluate((cfi) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
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
