import type { Page } from "@playwright/test"

/**
 * Runs `play` with the page's clock held: time stands still in the page, and
 * moves only when `play` moves it, with `page.clock.runFor()`. A spec holds
 * the clock to give an input the timing it asks for, on any runner: a busy
 * runner puts more time between two input commands than the spec asked for.
 * The clock runs again once `play` ends, or throws.
 *
 * Install the page's clock before the page loads, with
 * `page.clock.install()`, so that every timer of the page is on it.
 */
export const holdPageClockDuring = async (
  page: Page,
  play: () => Promise<void>,
) => {
  // `pauseAt` refuses a time in the past, and the page's clock runs on while
  // the call travels, so it pauses a second ahead. That jump fires at once
  // every timer due within the second, which an idle reader does not mind.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))

  try {
    await play()
  } finally {
    await page.clock.resume()
  }
}
