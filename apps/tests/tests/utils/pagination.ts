import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

/**
 * The reader exists and its current result has settled. A navigation
 * withdraws the current result before the call that starts it returns, which
 * core's `settlement.test.ts` holds pagination to, so awaited on the line
 * after one, this waits for that navigation's own result.
 */
export const waitForSettled = (page: Page) =>
  page.waitForFunction(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader | undefined

    return reader?.pagination.state.isSettled === true
  })

/**
 * Resizes the window and resolves once the reader has laid out for the new
 * size and its result has settled. Unlike a navigation, a resize reaches the
 * reader after the call that makes it has returned, so the result already on
 * screen is still settled on the line after it, and `waitForSettled` would
 * accept it.
 *
 * The wait is tied to the resize rather than to time or to the next
 * settlement: nothing is accepted until the reader lays out its viewport after
 * the window's resize event, and then only the first settled result after
 * that. A result that settles before the resize, or for an item loading in the
 * background, cannot satisfy it. A timeout says which of the two never came.
 *
 * Restoration is a navigation of its own that may still be landing, so assert
 * what it should show with a poll. When the resize changes what is on screen,
 * polling for the new result is tied to it already, and this is not needed.
 */
export const resizeAndSettle = async (
  page: Page,
  size: { width: number; height: number },
) => {
  await page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    /**
     * Resolves on the first accepted value emitted after subscribing. A value
     * handed back during the subscribe call is a replay of the current state,
     * which predates the resize, so it is ignored.
     */
    const once = <T>(
      source: {
        subscribe: (next: (value: T) => void) => { unsubscribe: () => void }
      },
      accept: (value: T) => boolean,
      then: () => void,
    ) => {
      let replaying = true
      const subscription = source.subscribe((value) => {
        if (replaying || !accept(value)) return

        subscription.unsubscribe()
        then()
      })
      replaying = false
    }

    // @ts-expect-error scratch slot for the pending wait
    window.__settled = new Promise<void>((resolve, reject) => {
      let hasReacted = false
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              hasReacted
                ? "no settled pagination result within 10s of the window resize"
                : "the reader did not react to the window resize within 10s",
            ),
          ),
        10_000,
      )
      const settled = () => {
        hasReacted = true
        once(
          reader.pagination.state$,
          (state) => state.isSettled,
          () => {
            clearTimeout(timer)
            resolve()
          },
        )
      }

      // The container observer is debounced, so the viewport layout is the
      // first thing the reader does for the new size.
      window.addEventListener(
        "resize",
        () => once(reader.viewport.layout$, () => true, settled),
        { once: true },
      )
    })
  })

  await page.setViewportSize(size)

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
