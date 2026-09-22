import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

/** The reader exists and has settled on its first page. */
export const waitForReader = (page: Page) =>
  page.waitForFunction(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader | undefined

    return reader?.pagination.state.isSettled === true
  })

type Trigger = "user navigation" | "window resize"

/**
 * Runs `action` and resolves once the result the reader computes for it has
 * settled. The wait is tied to the action rather than to time or to the next
 * settlement: nothing is accepted until the reader reports the trigger the
 * action produces (the user entry on the navigation stream, or the viewport
 * layout that follows the window's resize event), and then only the first
 * settled result after that. A result that settles between arming and the
 * action, or for an item loading in the background, cannot satisfy it.
 */
const settleAfter = async (
  page: Page,
  trigger: Trigger,
  action: () => Promise<unknown>,
) => {
  await page.evaluate((trigger) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    /**
     * Resolves on the first accepted value emitted after subscribing. A value
     * handed back during the subscribe call is a replay of the current state,
     * which predates the action, so it is ignored.
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
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              `no settled pagination result within 10s of the ${trigger}`,
            ),
          ),
        10_000,
      )
      const settled = () =>
        once(
          reader.pagination.state$,
          (state) => state.isSettled,
          () => {
            clearTimeout(timer)
            resolve()
          },
        )

      if (trigger === "user navigation") {
        once(
          reader.navigation.navigation$,
          (navigation) => navigation.triggeredBy === "user",
          settled,
        )
      } else {
        // The container observer is debounced, so the viewport layout is the
        // first thing the reader does for the new size.
        window.addEventListener(
          "resize",
          () => once(reader.viewport.layout$, () => true, settled),
          { once: true },
        )
      }
    })
  }, trigger)

  await action()

  await page.evaluate(
    () =>
      // @ts-expect-error scratch slot for the pending wait
      window.__settled as Promise<void>,
  )
}

/** Runs a navigation and resolves once the result computed for it settles. */
export const navigateAndSettle = (
  page: Page,
  navigate: () => Promise<unknown>,
) => settleAfter(page, "user navigation", navigate)

/**
 * Resizes the window and resolves once the reader has laid out for the new
 * size and its result has settled. Restoration is a navigation of its own that
 * may still be landing, so assert what it should show with a poll.
 */
export const resizeAndSettle = (
  page: Page,
  size: { width: number; height: number },
) => settleAfter(page, "window resize", () => page.setViewportSize(size))

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
