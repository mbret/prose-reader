import type { Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { getReader } from "./reader"

/**
 * The reader exists and its current result has settled. A navigation
 * withdraws the current result before the call that starts it returns, which
 * core's `settlement.test.ts` holds pagination to, so awaited on the line
 * after one, this waits for that navigation's own result.
 */
export const waitForSettled = async (page: Page) => {
  const reader = await getReader(page)

  await page.waitForFunction(
    (reader) => reader.pagination.state.isSettled,
    reader,
  )
}

/**
 * The reader exists, its current result has settled, and the layout that
 * result was found on is still the current one.
 */
export const waitForSettledOnCurrentLayout = async (page: Page) => {
  const reader = await getReader(page)

  await page.waitForFunction(
    (reader) =>
      reader.pagination.state.isSettled && reader.spine.isLayoutCurrent(),
    reader,
  )
}

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
  const reader = await getReader(page)

  // Wrapped in an object, so that the handle comes back with the wait still
  // pending: a promise returned as is would be awaited before the resize.
  const pendingSettlement = await reader.evaluateHandle((reader) => {
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

    const settled = new Promise<void>((resolve, reject) => {
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
      const awaitSettledResult = () => {
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
        () => once(reader.viewport.layout$, () => true, awaitSettledResult),
        { once: true },
      )
    })

    return { settled }
  })

  await page.setViewportSize(size)

  await pendingSettlement.evaluate(({ settled }) => settled)
}

/**
 * Lays the reader out, with `reader.layout()` or, given `settings`, by
 * updating them, and resolves once that layout has voided the current
 * navigation, the reader has restored the navigation onto the new layout, and
 * that result has settled. The wait starts in the same task as the layout, so
 * a layout before it, such as for a chapter loading nearby, cannot meet it.
 *
 * Restoration can land where the navigation already was, so nothing on screen
 * tells when it happened. A layout that changes nothing is one such case.
 */
export const layOutAndRestore = async (
  page: Page,
  {
    settings,
  }: {
    // functions cannot be sent into the page
    settings?: Omit<
      Parameters<Reader["settings"]["update"]>[0],
      "getResource" | "getRenderer"
    >
  } = {},
) => {
  const reader = await getReader(page)

  await reader.evaluate(
    (reader, settings) =>
      new Promise<void>((resolve, reject) => {
        let isReplayingCurrentValue = true
        let isVoided = false
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                isVoided
                  ? "the navigation was not restored onto the new layout within 10s"
                  : "no layout voided the navigation within 10s",
              ),
            ),
          10_000,
        )
        const subscription =
          reader.navigation.navigationAgainstCurrentLayout$.subscribe(
            ({ navigation, holdsOnCurrentLayout }) => {
              if (isReplayingCurrentValue) return

              if (!holdsOnCurrentLayout) {
                isVoided = true

                return
              }

              if (!isVoided || navigation.triggeredBy !== "restoration") return

              subscription.unsubscribe()
              clearTimeout(timer)
              resolve()
            },
          )
        isReplayingCurrentValue = false

        if (settings) {
          reader.settings.update(settings)
        } else {
          reader.layout()
        }
      }),
    settings,
  )
  await waitForSettled(page)
}
