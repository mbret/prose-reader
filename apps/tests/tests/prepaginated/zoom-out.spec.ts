import { expect, type Page, test } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady, zoomAt } from "../utils"
import { getReader } from "../utils/reader"
import {
  expectLoadedSpineItemsToBeTheOnesOnScreen,
  getSpineItemIndexesOnScreen,
  recordSpineItemsUnloadedOnScreen,
} from "../utils/visibility"

/**
 * Opens the book on a page, with no page preloaded: the reader loads the
 * pages on screen and no other. The book is paginated, and a portrait screen
 * shows one page at a time.
 */
const openOnPageWithNoPagePreloaded = async (
  page: Page,
  spineItemIndex: number,
) => {
  await page.setViewportSize({ width: 300, height: 400 })
  await page.goto(
    "http://localhost:3333/tests/prepaginated/index.html?preload=0",
  )
  await waitForSpineItemReady(page, [0])

  expect(
    await (await getReader(page)).evaluate((reader) => ({
      pageTurnMode: reader.settings.values.computedPageTurnMode,
      isSpread: reader.viewport.value.isSpread,
    })),
  ).toEqual({ pageTurnMode: "controlled", isSpread: false })

  await navigateToSpineItem({ page, index: spineItemIndex })
  await waitForSpineItemReady(page, [spineItemIndex])
  await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

  expect(await getSpineItemIndexesOnScreen(page)).toEqual([spineItemIndex])
}

test.describe("Given no page preloaded, and a page zoomed out to half its size", () => {
  test("it loads the pages on screen, and only them", async ({ page }) => {
    await openOnPageWithNoPagePreloaded(page, 3)

    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    await zoomAt({ page, scale: 0.5 })

    // The page stays in the middle, with half of the ones beside it.
    expect(await getSpineItemIndexesOnScreen(page)).toEqual([2, 3, 4])

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })

  test("moved, it loads the pages on screen where it moved, and only them", async ({
    page,
  }) => {
    await openOnPageWithNoPagePreloaded(page, 3)
    await zoomAt({ page, scale: 0.5 })
    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    // Moved right by a page as zoomed, 150px: the page before the previous
    // one comes on screen, and the next one goes.
    await (await getReader(page)).evaluate((reader) => {
      const { x, y } = reader.zoom.state.currentPosition

      reader.zoom.move({ x: x + 150, y })
    })

    expect(await getSpineItemIndexesOnScreen(page)).toEqual([1, 2, 3])

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })
})
