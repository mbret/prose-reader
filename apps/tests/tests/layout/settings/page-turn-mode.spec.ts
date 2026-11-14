import { expect, type Page } from "@playwright/test"
import { navigateToSpineItem } from "../../utils"
import {
  expectSpineItemKeptThroughPageTurnModes,
  type PageTurnMode,
} from "../../utils/pageTurnMode"
import { layOutAndSettle, waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"
import {
  getSpineItemIndexesOnScreen,
  updateSettingsAndGetSpineItemsOnScreen,
} from "../../utils/visibility"

/**
 * A change of page turn mode moves the book from one rendering layer to the
 * other: the pages turn in one and scroll in the other. The page the reader
 * is on has to stay on screen through the change, and whatever the browser
 * reports of the scroll element meanwhile is not the user scrolling.
 */

const url = "http://localhost:3333/tests/layout/settings/index.html"

const SIXTH_PAGE = 5
const NINTH_PAGE = 8

const openOnSixthPage = async (page: Page, pageTurnMode: PageTurnMode) => {
  await page.setViewportSize({ width: 400, height: 700 })
  await page.goto(url)
  await waitForSettled(page)

  // The scenario creates its reader with pages that turn.
  if (pageTurnMode === "scrollable") {
    await layOutAndSettle(page, { settings: { pageTurnMode } })
  }

  await navigateToSpineItem({ page, index: SIXTH_PAGE })
  await expect
    .poll(() => getSpineItemIndexesOnScreen(page))
    .toEqual([SIXTH_PAGE])
  await waitForSettled(page)
}

const changes: { from: PageTurnMode; to: PageTurnMode }[] = [
  { from: "controlled", to: "scrollable" },
  { from: "scrollable", to: "controlled" },
]

test.describe("Given a book open on its sixth page", () => {
  for (const { from, to } of changes) {
    test.describe(`When the page turn mode goes from ${from} to ${to}`, () => {
      test("Then the page is still the one on screen before the reader lays out again", async ({
        page,
      }) => {
        await openOnSixthPage(page, from)

        const { isLayoutCurrent, spineItems } =
          await updateSettingsAndGetSpineItemsOnScreen(page, {
            pageTurnMode: to,
          })

        expect(
          isLayoutCurrent,
          "whether the reader has already laid out for the mode",
        ).toBe(false)
        expect(
          spineItems
            .filter(({ isOnScreen }) => isOnScreen)
            .map(({ index }) => index),
        ).toEqual([SIXTH_PAGE])
      })

      test("Then the page is the one on screen once the reader has laid out again", async ({
        page,
      }) => {
        await openOnSixthPage(page, from)

        await layOutAndSettle(page, { settings: { pageTurnMode: to } })

        await expect
          .poll(() => getSpineItemIndexesOnScreen(page))
          .toEqual([SIXTH_PAGE])
      })
    })
  }

  test.describe("When the user scrolls to another page, and the page turn mode becomes controlled before that scroll is over", () => {
    test("Then the page the user scrolled to is the one on screen", async ({
      page,
    }) => {
      await openOnSixthPage(page, "scrollable")

      const reader = await getReader(page)

      await reader.evaluate(async (reader, pageIndex) => {
        const scrollElement =
          reader.navigation.scrollNavigationController.value.element

        if (!scrollElement) throw new Error("the reader has no scroll element")

        const { top } = reader.spine.getSpineItemSpineLayoutInfo(pageIndex)
        let stopWatchingTheLock = () => {}

        /**
         * The reader holds the navigation from the first event of a scroll
         * it did not make until that scroll is over. The mode changes in the
         * task the lock is taken in, so the scroll is still in progress.
         */
        await new Promise<void>((resolve) => {
          const subscription = reader.navigation.isLocked$.subscribe(
            (isLocked) => {
              if (isLocked) resolve()
            },
          )

          stopWatchingTheLock = () => subscription.unsubscribe()
          scrollElement.scrollTo({ top })
        })
        stopWatchingTheLock()

        reader.settings.update({ pageTurnMode: "controlled" })
      }, NINTH_PAGE)

      await expect
        .poll(() => getSpineItemIndexesOnScreen(page))
        .toEqual([NINTH_PAGE])
      await waitForSettled(page)
      expect(await getSpineItemIndexesOnScreen(page)).toEqual([NINTH_PAGE])
    })
  })

  test.describe("When the page turn mode goes to scrollable and back, twice", () => {
    test("Then the page is the one on screen after each change", async ({
      page,
    }) => {
      await openOnSixthPage(page, "controlled")

      await expectSpineItemKeptThroughPageTurnModes(page, SIXTH_PAGE, [
        "scrollable",
        "controlled",
        "scrollable",
        "controlled",
      ])
    })
  })
})
