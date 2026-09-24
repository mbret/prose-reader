import { expect, type Page, test } from "@playwright/test"
import {
  navigateToSpineItem,
  turnLeft,
  turnRight,
  waitForSpineItemReady,
} from "../../utils"

const URL = "http://localhost:3333/tests/navigation/boundary/index.html"
const LAST_SPINE_INDEX = 11 // sample.cbz has 12 single-page spine items

/**
 * What must not fire is proved in the unit layer, where the test holds the
 * clock, since a browser spec can only guess how long to wait for nothing to
 * happen: turning back and forward at the end of the book in core's
 * `boundaryTurns.test.ts`, and a drag below the pan threshold in the gestures
 * enhancer's `index.test.ts`.
 */

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
})
