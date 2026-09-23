import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"

/** The reader exists and has settled on its first page. */
export const waitForReader = (page: Page) =>
  page.waitForFunction(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader | undefined

    return reader?.pagination.state.isSettled === true
  })

type Trigger = "user navigation" | "window resize" | "settings update"

/**
 * Runs `action` and resolves once the result the reader computes for it has
 * settled. The wait is tied to the action rather than to time or to the next
 * settlement: nothing is accepted until the reader reports the trigger the
 * action produces (the user entry on the navigation stream, or the viewport
 * layout that follows the window's resize event or the settings update), and
 * then only the first settled result after that. A result that settles
 * between arming and the action, or for an item loading in the background,
 * cannot satisfy it. A timeout says which of the two never came.
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
      let hasReacted = false
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              hasReacted
                ? `no settled pagination result within 10s of the ${trigger}`
                : `the reader did not react to the ${trigger} within 10s`,
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

      if (trigger === "user navigation") {
        once(
          reader.navigation.navigation$,
          (navigation) => navigation.triggeredBy === "user",
          settled,
        )
      } else if (trigger === "settings update") {
        // A layout the update requires measures the viewport first.
        once(reader.viewport.layout$, () => true, settled)
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
 * Updates the settings and resolves once the reader has laid out for them and
 * its result has settled. It rejects when the update does not lay out, so use
 * it only for settings that change where the pages go or how they are sized.
 */
export const updateSettingsAndSettle = (
  page: Page,
  // functions cannot be sent into the page
  settings: Omit<
    Parameters<Reader["settings"]["update"]>[0],
    "getResource" | "getRenderer"
  >,
) =>
  settleAfter(page, "settings update", () =>
    page.evaluate((settings) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.settings.update(settings)
    }, settings),
  )

/**
 * Resolves once the reader has handled every container resize the browser has
 * reported, so it cannot start a layout for one after this returns. The
 * layouts it started may still be laying out items; wait on pagination for
 * those. A ResizeObserver reports in the rendering step after a size changes,
 * so each check first lets two frames render, which delivers any report
 * already due, then waits for the reader to finish with it. It ends on a check
 * that finds nothing pending.
 */
export const waitForResizesHandled = (page: Page) =>
  page.evaluate(async () => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader

    const twoFrames = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )

    /** The current value, which the stream replays on subscribe. */
    const isPending = () => {
      let pending = false

      reader.isContainerResizePending$
        .subscribe((value) => {
          pending = value
        })
        .unsubscribe()

      return pending
    }

    const whenHandled = () =>
      new Promise<void>((resolve) => {
        const subscription = reader.isContainerResizePending$.subscribe(
          (pending) => {
            if (pending) return

            resolve()
            queueMicrotask(() => subscription.unsubscribe())
          },
        )
      })

    for (;;) {
      await twoFrames()

      if (!isPending()) return

      await whenHandled()
    }
  })

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
