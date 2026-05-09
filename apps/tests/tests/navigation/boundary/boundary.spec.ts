import { expect, type Page, test } from "@playwright/test"
import {
  navigateToSpineItem,
  turnLeft,
  turnRight,
  waitForSpineItemReady,
} from "../../utils"

const URL = "http://localhost:3333/tests/navigation/boundary/index.html"
const LAST_SPINE_INDEX = 11 // sample.cbz has 12 single-page spine items

const marker = (page: Page) => page.locator("#boundary-marker")

/**
 * After any user interaction, settled navigation is asynchronous. We give
 * the boundary stream a generous window to either fire or not fire before
 * asserting on `data-count`. This is also what the existing nav specs do
 * (e.g. they `expect(...).toBeInViewport(...)` which polls).
 */
const SETTLE_DELAY_MS = 250

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

    // Reset the marker after the goToSpineItem navigation. That nav itself
    // is in-bounds and shouldn't have produced a boundary, but we're
    // explicit about the precondition for this test.
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

test.describe("Given the user is at an edge and navigates back then forward", () => {
  test("does not fire any boundary (both navigations are in-bounds)", async ({
    page,
  }) => {
    await setup(page)

    await navigateToSpineItem({ page, index: LAST_SPINE_INDEX })
    await waitForSpineItemReady(page, [LAST_SPINE_INDEX])

    await page.evaluate(() => {
      const el = document.getElementById("boundary-marker")
      if (!el) return
      el.dataset.count = "0"
      el.dataset.last = ""
    })

    // Step away from the edge: in-bounds, no boundary.
    await turnLeft({ page })
    await waitForSpineItemReady(page, [LAST_SPINE_INDEX - 1])

    // Step back onto the edge: also in-bounds (the resolved position lands
    // on the last item, but the requested target is in-bounds — not an
    // overshoot of the spine).
    await turnRight({ page })
    await waitForSpineItemReady(page, [LAST_SPINE_INDEX])

    await page.waitForTimeout(SETTLE_DELAY_MS)

    await expect(marker(page)).toHaveAttribute("data-count", "0")
    await expect(marker(page)).toHaveAttribute("data-last", "")
  })
})

test.describe("Given the user is at an edge and starts a small pan that doesn't cross the recognizer threshold", () => {
  test("does not fire any boundary (no navigation happens)", async ({
    page,
  }) => {
    await setup(page)

    // We start on the first page (the start edge). The pan is intentionally
    // smaller than the gesture enhancer's pan recognizer threshold
    // (`posThreshold: 20`), and is positioned in the middle of the screen
    // (outside the left/right tap zones), so neither pan navigation nor a
    // fallback tap navigation will be issued.
    await page.evaluate(() => {
      const el = document.getElementById("boundary-marker")
      if (!el) return
      el.dataset.count = "0"
      el.dataset.last = ""
    })

    const centerX = 200
    const centerY = 300

    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 5, centerY, { steps: 2 })
    await page.mouse.up()

    await page.waitForTimeout(SETTLE_DELAY_MS)

    await expect(marker(page)).toHaveAttribute("data-count", "0")
    await expect(marker(page)).toHaveAttribute("data-last", "")
  })
})
