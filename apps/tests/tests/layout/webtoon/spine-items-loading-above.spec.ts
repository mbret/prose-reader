import { expect, type Page, test } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "../../utils"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import {
  getPlaceOfSpineItem,
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

/**
 * Opens the book at the top of a spine item, with the two above it waiting at
 * the end of their load. Resolves to a handle on what holds them, and the top
 * of the spine item in the spine by then.
 */
const openBelowSpineItemsStillLoading = async (page: Page) => {
  await page.setViewportSize({ width: 300, height: 400 })
  await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")
  await waitForSettledOnCurrentLayout(page)

  const loadsHeld = await holdLoadOfSpineItems(page, SPINE_ITEMS_LOADING_ABOVE)

  await navigateToSpineItem({ page, index: SPINE_ITEM_ON_SCREEN })
  await waitForSpineItemReady(page, [SPINE_ITEM_ON_SCREEN])
  await page.waitForFunction(
    (loadsHeld) => loadsHeld.areAllWaiting(),
    loadsHeld,
  )
  await waitForSettledOnCurrentLayout(page)

  const { topInSpine, distanceToTopOfScreen } = await getPlaceOfSpineItem(
    page,
    SPINE_ITEM_ON_SCREEN,
  )

  expect(
    Math.abs(distanceToTopOfScreen),
    "the distance from the top of the spine item to the top of the screen",
  ).toBeLessThan(1)

  return { loadsHeld, topInSpineBeforeLoads: topInSpine }
}

test.describe("Given a book that scrolls, at the top of a spine item with the two above it still loading", () => {
  test.describe("When the two above finish loading", () => {
    test("every frame shows the top of that spine item", async ({ page }) => {
      const { loadsHeld, topInSpineBeforeLoads } =
        await openBelowSpineItemsStillLoading(page)
      const stopAndGetDistancesAtEachFrame =
        await recordDistanceFromTopOfSpineItemToTopOfScreenAtEachFrame(
          page,
          SPINE_ITEM_ON_SCREEN,
        )

      await loadsHeld.evaluate(({ letLoadsFinish }) => {
        letLoadsFinish()
      })
      await waitForSpineItemsLoadedAndReaderAtRest(
        page,
        SPINE_ITEMS_LOADING_ABOVE,
      )

      const distancesAtEachFrame = await stopAndGetDistancesAtEachFrame()
      const { topInSpine } = await getPlaceOfSpineItem(
        page,
        SPINE_ITEM_ON_SCREEN,
      )

      expect(
        topInSpine,
        "the top of the spine item in the spine, which the loads above move down",
      ).toBeGreaterThan(topInSpineBeforeLoads)
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
      const { loadsHeld, topInSpineBeforeLoads } =
        await openBelowSpineItemsStillLoading(page)
      const reader = await getReader(page)

      // In one task, so that the scroll is still in progress when they load.
      const stateWhenItemsLaidOut = await page.evaluateHandle(
        ({ reader, loadsHeld, distanceScrolledByUser }) => {
          const scrollElement =
            reader.navigation.scrollNavigationController.value.element
          const stateWhenItemsLaidOut: { wasNavigationLocked?: boolean } = {}
          const itemsLaidOut = reader.spine.itemsLayout$.subscribe(() => {
            itemsLaidOut.unsubscribe()
            // Replays whether the lock is held now.
            reader.navigation.isLocked$
              .subscribe((isLocked) => {
                stateWhenItemsLaidOut.wasNavigationLocked = isLocked
              })
              .unsubscribe()
          })

          scrollElement?.scrollTo({
            top: scrollElement.scrollTop + distanceScrolledByUser,
          })
          loadsHeld.letLoadsFinish()

          return stateWhenItemsLaidOut
        },
        { reader, loadsHeld, distanceScrolledByUser },
      )

      await waitForSpineItemsLoadedAndReaderAtRest(
        page,
        SPINE_ITEMS_LOADING_ABOVE,
      )

      const { topInSpine, distanceToTopOfScreen } = await getPlaceOfSpineItem(
        page,
        SPINE_ITEM_ON_SCREEN,
      )

      expect(
        topInSpine,
        "the top of the spine item in the spine, which the loads above move down",
      ).toBeGreaterThan(topInSpineBeforeLoads)
      expect(
        (await stateWhenItemsLaidOut.jsonValue()).wasNavigationLocked,
        "whether the scroll was still in progress when the spine items were laid out",
      ).toBe(true)
      expect(
        Math.abs(distanceToTopOfScreen - distanceScrolledByUser),
        `how far the screen is from ${distanceScrolledByUser} px below the top of the spine item`,
      ).toBeLessThan(1)
      expect(
        await reader.evaluate(
          (reader) => reader.navigation.getNavigation().spineItem,
        ),
      ).toBe(SPINE_ITEM_ON_SCREEN)
    })
  })
})
