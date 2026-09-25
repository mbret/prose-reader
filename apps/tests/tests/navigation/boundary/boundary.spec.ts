import { expect, type Page, test } from "@playwright/test"
import {
  expectSpineItemsInViewport,
  navigateToSpineItem,
  turnLeft,
  turnRight,
  waitForSpineItemReady,
} from "../../utils"
import { waitForSettled } from "../../utils/pagination"

const URL = "http://localhost:3333/tests/navigation/boundary/index.html"
const LAST_SPINE_INDEX = 11 // sample.cbz has 12 single-page spine items

const marker = (page: Page) => page.locator("#boundary-marker")

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

  /**
   * The start boundary means the user tried to go before the first page. A
   * finger rarely stays perfectly still, so a tap in the middle of the page
   * (to bring up the reader's menu, say) usually moves a few pixels. That must
   * stay a tap, not become an attempt to leave the book.
   *
   * Moving right on the first page pans towards a page before it, so a small
   * move taken for a pan would fire the start boundary once it is released.
   * Below the pan threshold, the gestures enhancer reports a tap instead, and
   * in the middle of the page it is outside the page turn margins, so nothing
   * navigates.
   *
   * The tap is reported when the pointer is released and ends the gesture, so
   * the spec waits for it rather than for time to pass. In a browser, the drag
   * lands on the page's frame and reaches the gestures through core's pointer
   * forwarding, which the gestures enhancer's unit test does not go through.
   * The browser's own drag of the page's image would cancel the pointer before
   * it is released; the gestures enhancer stops that drag.
   */
  test("a drag too short to pan is an unhandled tap, and does not fire the start boundary", async ({
    page,
  }) => {
    await setup(page)

    // 5px, below the pan recognizer's `posThreshold` of 20, in the middle of
    // the page, away from the page turn margins
    await page.mouse.move(200, 300)
    await page.mouse.down()
    await page.mouse.move(205, 300, { steps: 2 })
    await page.mouse.up()

    await expect(marker(page)).toHaveAttribute("data-gestures", "unhandled tap")
    await expectSpineItemsInViewport({ page, indexes: [0] })
    await expect(marker(page)).toHaveAttribute("data-count", "0")
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
    await waitForSettled(page)

    await page.evaluate(() => {
      const el = document.getElementById("boundary-marker")
      if (!el) return
      el.dataset.count = "0"
      el.dataset.last = ""
    })

    // away from the end, which must not read as the start either
    await turnLeft({ page })
    await waitForSettled(page)
    await expectSpineItemsInViewport({ page, indexes: [LAST_SPINE_INDEX - 1] })

    // back onto the last page, without going past it
    await turnRight({ page })
    await waitForSettled(page)
    await expectSpineItemsInViewport({ page, indexes: [LAST_SPINE_INDEX] })

    // A turn is judged for a boundary as it settles, in the same step that
    // lets its page settle, so both turns have been judged by now.
    await expect(marker(page)).toHaveAttribute("data-count", "0")
  })
})
