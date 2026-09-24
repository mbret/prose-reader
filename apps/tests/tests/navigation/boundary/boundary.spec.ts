import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  navigateToSpineItem,
  turnLeft,
  turnRight,
  waitForSpineItemReady,
} from "../../utils"

const URL = "http://localhost:3333/tests/navigation/boundary/index.html"
const LAST_SPINE_INDEX = 11 // sample.cbz has 12 single-page spine items

/**
 * A drag below the pan threshold fires no boundary. It issues no navigation,
 * so a browser spec has nothing to wait for before checking that nothing
 * happened, and it is proved in the gestures enhancer's `index.test.ts`, where
 * the test holds the clock.
 */

const marker = (page: Page) => page.locator("#boundary-marker")

/**
 * The page the reader has settled on, or `undefined` while it is still getting
 * there. Polled after a turn, it waits for that turn's own page, which a result
 * settled before the turn cannot satisfy.
 */
const settledPage = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const { isSettled, begin } = (window.reader as Reader).pagination.state

    return isSettled ? begin.spineItemIndex : undefined
  })

const setup = async (page: Page) => {
  await page.setViewportSize({ width: 400, height: 600 })
  await page.goto(URL)
  await waitForSpineItemReady(page, [0])
}

test.describe("Given the user is on the first page (start of book)", () => {
  test("turnLeft fires the start boundary", async ({ page }) => {
    await setup(page)

    await expect(marker(page)).toHaveAttribute("data-count", "0")

    await turnLeft({ page })

    await expect(marker(page)).toHaveAttribute("data-count", "1")
    await expect(marker(page)).toHaveAttribute("data-last", "start")
  })
})

test.describe("Given the user is on the last page (end of book)", () => {
  test("turnRight fires the end boundary", async ({ page }) => {
    await setup(page)

    await navigateToSpineItem({ page, index: LAST_SPINE_INDEX })
    await waitForSpineItemReady(page, [LAST_SPINE_INDEX])

    await page.evaluate(() => {
      const el = document.getElementById("boundary-marker")
      if (!el) return
      el.dataset.count = "0"
      el.dataset.last = ""
    })

    await turnRight({ page })

    await expect(marker(page)).toHaveAttribute("data-count", "1")
    await expect(marker(page)).toHaveAttribute("data-last", "end")
  })

  /**
   * The end boundary means the user asked to go past the last page, not that
   * they arrived on it. The test above cannot tell the two apart: turning right
   * on the last page also lands on the last page.
   *
   * Turning right from the page before asks for the exact position where the
   * last page starts, which is also the furthest the reader can go, so the
   * reader has to count that position as inside the book. Both come from real
   * layout here, where the unit test only has round numbers.
   */
  test("turning away and back onto it does not fire the end boundary", async ({
    page,
  }) => {
    await setup(page)

    await navigateToSpineItem({ page, index: LAST_SPINE_INDEX })
    await expect.poll(() => settledPage(page)).toBe(LAST_SPINE_INDEX)

    await page.evaluate(() => {
      const el = document.getElementById("boundary-marker")
      if (!el) return
      el.dataset.count = "0"
      el.dataset.last = ""
    })

    // away from the end, which must not read as the start either
    await turnLeft({ page })
    await expect.poll(() => settledPage(page)).toBe(LAST_SPINE_INDEX - 1)

    // back onto the last page, without going past it
    await turnRight({ page })
    await expect.poll(() => settledPage(page)).toBe(LAST_SPINE_INDEX)

    // A turn is judged for a boundary as it settles, in the same step that
    // lets its page settle, so both turns have been judged by now.
    await expect(marker(page)).toHaveAttribute("data-count", "0")
  })
})
