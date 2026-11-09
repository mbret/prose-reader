import { expect, type Page, test } from "@playwright/test"
import { navigateToSpineItem } from "../../utils"
import { layOutAndRestore, waitForSettled } from "../../utils/pagination"
import {
  getSpineItemIndexesOnScreen,
  getSpineItemsOnScreen,
} from "../../utils/visibility"

/**
 * A change of page turn mode moves the book from one rendering layer to the
 * other: the pages turn in one and scroll in the other. The page the reader
 * is on has to stay on screen through the change, and whatever the browser
 * reports of the scroll element meanwhile is not the user scrolling.
 */

const url = "http://localhost:3333/tests/layout/settings/index.html"

const SIXTH_PAGE = 5

type PageTurnMode = "controlled" | "scrollable"

const openOnSixthPage = async (page: Page, pageTurnMode: PageTurnMode) => {
  await page.setViewportSize({ width: 400, height: 700 })
  await page.goto(url)
  await waitForSettled(page)

  // The scenario creates its reader with pages that turn.
  if (pageTurnMode === "scrollable") {
    await layOutAndRestore(page, { settings: { pageTurnMode } })
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

        const { isLayoutCurrent, spineItems } = await getSpineItemsOnScreen(
          page,
          { rightAfterUpdatingSettings: { pageTurnMode: to } },
        )

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

        await layOutAndRestore(page, { settings: { pageTurnMode: to } })

        await expect
          .poll(() => getSpineItemIndexesOnScreen(page))
          .toEqual([SIXTH_PAGE])
      })
    })
  }

  test.describe("When the page turn mode goes to scrollable and back, twice", () => {
    test("Then the page is the one on screen after each change", async ({
      page,
    }) => {
      await openOnSixthPage(page, "controlled")

      const pageTurnModes: PageTurnMode[] = [
        "scrollable",
        "controlled",
        "scrollable",
        "controlled",
      ]

      for (const [change, pageTurnMode] of pageTurnModes.entries()) {
        await layOutAndRestore(page, { settings: { pageTurnMode } })

        await expect
          .poll(
            () => getSpineItemIndexesOnScreen(page),
            `the pages on screen after change ${change + 1}, to ${pageTurnMode}`,
          )
          .toEqual([SIXTH_PAGE])
      }
    })
  })
})
