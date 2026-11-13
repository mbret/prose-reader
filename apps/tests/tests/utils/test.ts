import { expect, test as playwrightTest } from "@playwright/test"

type UncaughtPageErrorFixtures = {
  /**
   * The uncaught errors and the unhandled promise rejections of the pages of
   * the test, so far. A test that expects one asserts it and removes it:
   * `uncaughtPageErrors.splice(0)` gives the errors and empties the list.
   */
  uncaughtPageErrors: Error[]
}

/**
 * The `test` every spec declares its tests with. It is Playwright's, and it
 * also fails a test that ends with an error in `uncaughtPageErrors`, whatever
 * the test asserts.
 *
 * It checks when the test ends, so a test that fails for another reason
 * reports the uncaught errors of its page too. The list is a fixture of its
 * own, which the context needs: Playwright closes the context first, so the
 * check also sees the errors of a page that closes.
 */
export const test = playwrightTest.extend<UncaughtPageErrorFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads the fixtures that a fixture needs from this pattern, and this one needs none.
  uncaughtPageErrors: async ({}, use) => {
    const uncaughtPageErrors: Error[] = []

    await use(uncaughtPageErrors)

    expect(
      // WebKit gives an unhandled rejection no stack.
      uncaughtPageErrors.map((error) => error.stack || String(error)),
      "the page had an uncaught error",
    ).toEqual([])
  },
  context: async ({ context, uncaughtPageErrors }, use) => {
    context.on("weberror", (webError) => {
      uncaughtPageErrors.push(webError.error())
    })

    await use(context)
  },
})
