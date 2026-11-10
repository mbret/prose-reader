import { expect, test } from "@playwright/test"
import { navigateToSpineItem } from "../utils"
import { expectSpineItemKeptThroughPageTurnModes } from "../utils/pageTurnMode"
import { waitForSettled } from "../utils/pagination"
import { getSpineItemIndexesOnScreen } from "../utils/visibility"

/**
 * The pdf renderer lays a loaded page out once it has drawn it, so a layout
 * of the reader takes several tasks. The scrolls the browser reports
 * meanwhile, as the pages move, are not the user scrolling.
 */

const url = "http://localhost:3333/tests/pdf/index.html?file=twelve-pages.pdf"

const SIXTH_PAGE = 5

test.describe("Given a pdf open on its sixth page", () => {
  test.describe("When the page turn mode goes to scrollable and back, twice", () => {
    test("Then the page is the one on screen after each change", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 400, height: 700 })
      await page.goto(url)
      await waitForSettled(page)

      await navigateToSpineItem({ page, index: SIXTH_PAGE })
      await expect
        .poll(() => getSpineItemIndexesOnScreen(page))
        .toEqual([SIXTH_PAGE])
      await waitForSettled(page)

      await expectSpineItemKeptThroughPageTurnModes(page, SIXTH_PAGE, [
        "scrollable",
        "controlled",
        "scrollable",
        "controlled",
      ])
    })
  })
})
