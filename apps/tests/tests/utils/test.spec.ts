import { expect } from "@playwright/test"
import { test } from "./test"

/**
 * What proves that the shared `test` gets the uncaught errors of a page, on
 * every project. A script of the page throws, as the reader does: Firefox
 * does not report an error thrown by a function that a spec defines in
 * `page.evaluate`.
 *
 * Each test removes the error it expects. Without that, the shared `test`
 * fails it.
 */
test.describe("Given a test declared with the shared test", () => {
  test("it gets the error that a script of its page throws and nothing catches", async ({
    page,
    uncaughtPageErrors,
  }) => {
    await page.setContent(
      `<script>throw new Error("thrown by the page")</script>`,
    )

    expect(uncaughtPageErrors.splice(0).map(String)).toEqual([
      expect.stringContaining("thrown by the page"),
    ])
  })

  test("it gets the promise that a script of its page rejects and nothing handles", async ({
    page,
    uncaughtPageErrors,
  }) => {
    await page.setContent(
      `<script>Promise.reject(new Error("rejected by the page"))</script>`,
    )
    // The browser reports the rejection once the script has ended. The result
    // of this evaluation comes after that report.
    await page.evaluate(() => {})

    expect(uncaughtPageErrors.splice(0).map(String)).toEqual([
      expect.stringContaining("rejected by the page"),
    ])
  })
})
