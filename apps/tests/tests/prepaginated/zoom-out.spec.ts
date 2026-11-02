import { expect, test } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady, zoomAt } from "../utils"
import {
  expectLoadedSpineItemsToBeTheOnesOnScreen,
  getSpineItemIndexesOnScreen,
  recordSpineItemsUnloadedOnScreen,
} from "../utils/visibility"

/**
 * The scenario preloads no page, so the reader loads the pages on screen and
 * no other. A portrait screen shows one page at a time.
 */
test.describe("Given a page zoomed out to half its size", () => {
  test("it loads the pages on screen, and only them", async ({ page }) => {
    await page.setViewportSize({ width: 300, height: 400 })
    await page.goto("http://localhost:3333/tests/prepaginated/index.html")
    await waitForSpineItemReady(page, [0])
    await navigateToSpineItem({ page, index: 3 })
    await waitForSpineItemReady(page, [3])
    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemIndexesOnScreen(page)).toEqual([3])

    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    await zoomAt({ page, scale: 0.5 })

    // The page stays in the middle, with half of the ones beside it.
    expect(await getSpineItemIndexesOnScreen(page)).toEqual([2, 3, 4])

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })
})
