import { expect } from "@playwright/test"
import { test } from "./test"

/**
 * What proves that the shared `test` gets the uncaught errors of a page, on
 * every project. A script of the page throws, as the reader does: Firefox
 * does not report an error thrown by a function that a spec defines in
 * `page.evaluate`.
 */
test.describe("Given a test declared with the shared test", () => {
  test("it gets the error that a script of its page throws and nothing catches", async ({
    page,
    uncaughtPageErrors,
  }) => {
    await page.setContent(
      `<script>throw new Error("thrown by the page")</script>`,
    )

    await expect
      .poll(() => uncaughtPageErrors.map(String))
      .toEqual([expect.stringContaining("thrown by the page")])
    uncaughtPageErrors.splice(0)
  })

  test("it gets the promise that a script of its page rejects and nothing handles", async ({
    page,
    uncaughtPageErrors,
  }) => {
    await page.setContent(
      `<script>Promise.reject(new Error("rejected by the page"))</script>`,
    )

    await expect
      .poll(() => uncaughtPageErrors.map(String))
      .toEqual([expect.stringContaining("rejected by the page")])
    uncaughtPageErrors.splice(0)
  })

  // The documents of a book are in frames.
  test("it gets the error that a script of a frame of its page throws", async ({
    page,
    uncaughtPageErrors,
  }) => {
    await page.setContent(
      `<iframe srcdoc="<script>throw new Error('thrown by a frame')</script>"></iframe>`,
    )

    await expect
      .poll(() => uncaughtPageErrors.map(String))
      .toEqual([expect.stringContaining("thrown by a frame")])
    uncaughtPageErrors.splice(0)
  })
})
