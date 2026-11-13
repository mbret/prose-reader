import { expect } from "@playwright/test"
import { waitForSettledOnCurrentLayout } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * While the browser reports resizes, it reports only to the observers of
 * elements deeper than the ones it has reported so far. An observer started
 * on the viewport during the report of the viewport is left for the next
 * frame. The browser then sends the page an error: "ResizeObserver loop
 * completed with undelivered notifications". A layout waits for the viewport
 * to have a size with an observer, which must not start during that report.
 */
test.describe("Given a layout requested while the browser reports the size of the viewport", () => {
  test("should send the page no error", async ({ page }) => {
    await page.goto(url)
    await waitForSettledOnCurrentLayout(page)

    const reader = await getReader(page)

    const errorMessages = await reader.evaluate(async (reader) => {
      const errorMessages: string[] = []

      window.addEventListener("error", ({ message }) => {
        errorMessages.push(message)
      })

      await new Promise<void>((resolve) => {
        // A new observer reports the size of its element once.
        const viewportObserver = new ResizeObserver(() => {
          viewportObserver.disconnect()
          reader.layout()
          resolve()
        })

        viewportObserver.observe(reader.viewport.value.element)
      })

      // The browser sends the error in the frame of the report. The next
      // frame comes after it.
      await new Promise((resolve) => requestAnimationFrame(resolve))

      return errorMessages
    })

    expect(errorMessages).toEqual([])
  })
})
