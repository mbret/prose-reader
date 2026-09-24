import { expect, type Page, test } from "@playwright/test"
import { locateSpineItems, navigateToSpineItem } from "../../utils"
import {
  resizeAndSettle,
  updateSettingsAndSettle,
  waitForSettled,
} from "../../utils/pagination"

/**
 * The book is a pre-paginated manga, which shows a spread in landscape and
 * single pages in portrait when `spreadMode` is `auto`.
 *
 * These specs check what ends up on screen. That the reader lays out once for
 * each size or spread setting it is given is proved in
 * `layoutTriggers.test.ts`, where the test holds the observer and the clock.
 */

const url = "http://localhost:3333/tests/layout/spread/index.html"
const landscape = { width: 723, height: 671 }
const portrait = { width: 400, height: 671 }

/**
 * The share of the window's width the second page takes on screen: a half
 * when it is shown in a spread, all of it on its own. A page off screen still
 * has a width, so it first asserts that the page is in the window.
 */
const secondPageShareOfWidth = async (page: Page) => {
  const [secondPage] = await locateSpineItems({
    page,
    indexes: [1],
    isReady: false,
  })

  if (!secondPage) throw new Error("the second page is missing")

  // not 1: Mobile Safari measures a sub-pixel of the page outside the window
  await expect(secondPage).toBeInViewport({ ratio: 0.99 })

  const box = await secondPage.boundingBox()
  const window = page.viewportSize()

  if (!box || !window) throw new Error("the second page has no size on screen")

  return Math.round((box.width / window.width) * 100) / 100
}

/**
 * Opens the book at `size`, on its second page. The first page opens the book
 * alone, beside a blank page, so it spans the window either way; the second
 * shares a spread with the third, or is shown on its own.
 */
const openOnSecondPage = async (
  page: Page,
  size: { width: number; height: number },
) => {
  await page.setViewportSize(size)
  await page.goto(url)
  await waitForSettled(page)
  await navigateToSpineItem({ page, index: 1 })
  await waitForSettled(page)
}

test.describe("Given a reader resized across the spread threshold", () => {
  test("shows a spread in landscape and one page at a time in portrait", async ({
    page,
  }) => {
    await openOnSecondPage(page, landscape)

    expect(await secondPageShareOfWidth(page)).toBe(0.5)

    await resizeAndSettle(page, portrait)

    expect(await secondPageShareOfWidth(page)).toBe(1)

    await resizeAndSettle(page, landscape)

    expect(await secondPageShareOfWidth(page)).toBe(0.5)
  })
})

test.describe("Given the spreadMode setting", () => {
  test("never shows the pages one at a time in landscape", async ({ page }) => {
    await openOnSecondPage(page, landscape)

    expect(await secondPageShareOfWidth(page)).toBe(0.5)

    await updateSettingsAndSettle(page, { spreadMode: "never" })

    expect(await secondPageShareOfWidth(page)).toBe(1)
  })

  test("always shows a spread in portrait", async ({ page }) => {
    await openOnSecondPage(page, portrait)

    expect(await secondPageShareOfWidth(page)).toBe(1)

    await updateSettingsAndSettle(page, { spreadMode: "always" })

    expect(await secondPageShareOfWidth(page)).toBe(0.5)
  })
})
