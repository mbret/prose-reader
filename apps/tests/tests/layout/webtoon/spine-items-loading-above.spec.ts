import { expect, type Page, test } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "../../utils"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import {
  getDistanceFromTopOfSpineItemToTopOfScreen,
  holdLoadOfSpineItems,
  recordDistanceFromTopOfSpineItemToTopOfScreenAtEachFrame,
  waitForSpineItemsLoadedAndReaderAtRest,
} from "../../utils/scrolling"

/**
 * The spine item the reader goes to, and the two before it, which the reader
 * loads with it and the spec keeps loading. A spine item of this book is one
 * screen tall until its image loads, and more than three after: the two that
 * load above the screen move everything after them down.
 */
const SPINE_ITEM_ON_SCREEN = 6
const SPINE_ITEMS_LOADING_ABOVE = [4, 5]

const getLoadStatuses = async (page: Page, spineItemIndexes: number[]) =>
  (await getReader(page)).evaluate(
    (reader, spineItemIndexes) =>
      spineItemIndexes.map(
        (spineItemIndex) =>
          reader.spineItemsManager.get(spineItemIndex)?.value.loadStatus,
      ),
    spineItemIndexes,
  )

/**
 * Opens the book at the top of a spine item, with the two above it still
 * loading. Resolves to a handle on the function that lets them finish.
 */
const openBelowSpineItemsStillLoading = async (page: Page) => {
  await page.setViewportSize({ width: 300, height: 400 })
  await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")
  await waitForSettledOnCurrentLayout(page)

  const letLoadsFinish = await holdLoadOfSpineItems(
    page,
    SPINE_ITEMS_LOADING_ABOVE,
  )

  await navigateToSpineItem({ page, index: SPINE_ITEM_ON_SCREEN })
  await waitForSpineItemReady(page, [SPINE_ITEM_ON_SCREEN])
  await waitForSettledOnCurrentLayout(page)

  expect(await getLoadStatuses(page, SPINE_ITEMS_LOADING_ABOVE)).toEqual([
    "loading",
    "loading",
  ])
  expect(
    await getDistanceFromTopOfSpineItemToTopOfScreen(
      page,
      SPINE_ITEM_ON_SCREEN,
    ),
  ).toBeCloseTo(0, 0)

  return letLoadsFinish
}

test.describe("Given a book that scrolls, at the top of a spine item with the two above it still loading", () => {
  test.describe("When the two above finish loading", () => {
    test("every frame shows the top of that spine item", async ({ page }) => {
      const letLoadsFinish = await openBelowSpineItemsStillLoading(page)
      const getDistancesAtEachFrame =
        await recordDistanceFromTopOfSpineItemToTopOfScreenAtEachFrame(
          page,
          SPINE_ITEM_ON_SCREEN,
        )

      await letLoadsFinish.evaluate((letLoadsFinish) => {
        letLoadsFinish()
      })
      await waitForSpineItemsLoadedAndReaderAtRest(
        page,
        SPINE_ITEMS_LOADING_ABOVE,
      )

      const distancesAtEachFrame = await getDistancesAtEachFrame()

      expect(distancesAtEachFrame.length).toBeGreaterThan(0)
      expect(
        distancesAtEachFrame.filter((distance) => Math.abs(distance) >= 1),
        "the distances from the top of the spine item to the top of the screen, at the frames that showed another place",
      ).toEqual([])
    })
  })

  test.describe("When the user scrolls, and the two above finish loading before that scroll is over", () => {
    test("the screen stays on the place the user scrolled to, which becomes the navigation", async ({
      page,
    }) => {
      const distanceScrolledByUser = 150
      const letLoadsFinish = await openBelowSpineItemsStillLoading(page)
      const reader = await getReader(page)

      // In one task, so that the scroll is still in progress when they load.
      await page.evaluate(
        ({ reader, letLoadsFinish, distanceScrolledByUser }) => {
          const scrollElement =
            reader.navigation.scrollNavigationController.value.element

          scrollElement?.scrollTo({
            top: scrollElement.scrollTop + distanceScrolledByUser,
          })
          letLoadsFinish()
        },
        { reader, letLoadsFinish, distanceScrolledByUser },
      )
      await waitForSpineItemsLoadedAndReaderAtRest(
        page,
        SPINE_ITEMS_LOADING_ABOVE,
      )

      expect(
        await getDistanceFromTopOfSpineItemToTopOfScreen(
          page,
          SPINE_ITEM_ON_SCREEN,
        ),
      ).toBeCloseTo(distanceScrolledByUser, 0)
      expect(
        await reader.evaluate(
          (reader) => reader.navigation.getNavigation().spineItem,
        ),
      ).toBe(SPINE_ITEM_ON_SCREEN)
    })
  })
})
