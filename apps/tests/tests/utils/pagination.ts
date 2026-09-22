import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

export const waitForReader = (page: Page) =>
  page.waitForFunction(() => "reader" in window)

/**
 * Runs `action` and resolves once the reader publishes a settled pagination
 * result for it. The subscription is armed before the action, so a result
 * that settles synchronously inside the action is not missed, and the replayed
 * current result is skipped so a settled state from before the action does
 * not count.
 */
export const settleAfter = async (
  page: Page,
  action: () => Promise<unknown>,
) => {
  await page.evaluate(() => {
    // @ts-expect-error the harness exposes the reader on window for tests
    const reader = window.reader as Reader
    let seen = 0

    // @ts-expect-error scratch slot for the pending wait
    window.__settled = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        subscription.unsubscribe()
        reject(new Error("no settled pagination result within 10s"))
      }, 10_000)
      const subscription = reader.pagination.state$.subscribe((state) => {
        seen += 1

        if (seen > 1 && state.isSettled) {
          clearTimeout(timer)
          subscription.unsubscribe()
          resolve()
        }
      })
    })
  })

  await action()

  await page.evaluate(
    () =>
      // @ts-expect-error scratch slot for the pending wait
      window.__settled as Promise<void>,
  )
}

/**
 * Whether the exact position a cfi points to is inside the window, so a
 * restored page is judged by where the anchored character ended up rather
 * than by whichever element happens to contain it.
 */
export const isCfiPositionVisible = (page: Page, cfi: string) =>
  page.evaluate((cfi) => {
    // @ts-expect-error the harness exposes the reader on window for tests
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
