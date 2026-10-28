import { expect, test } from "@playwright/test"
import { expectSpineItemsInViewport, goToNextSpineItem } from "../../utils"
import {
  goToKoreaderProgress,
  readKoreaderReadingPosition,
} from "../../utils/koreader"
import { waitForSettled } from "../../utils/pagination"

/**
 * A KOReader sync client on a PDF pushes and pulls the 1-based page number,
 * which is the PDF's own page.
 */

const url = "http://localhost:3333/tests/koreader/pdf/index.html"

/** The fixture's pages. */
const PAGE_COUNT = 4

test.beforeEach(async ({ page }) => {
  // Portrait, so every page is shown on its own.
  await page.setViewportSize({ width: 690, height: 1294 })
  await page.goto(url)
  await waitForSettled(page)
})

test.describe("Given a PDF", () => {
  test("the book opens on page 1", async ({ page }) => {
    expect(await readKoreaderReadingPosition(page)).toMatchObject({
      spineItemIndex: 0,
      progress: "1",
    })
  })

  test("going to a page shows it, and reports it", async ({ page }) => {
    for (const progress of ["3", "2", "4"]) {
      await goToKoreaderProgress(page, progress)

      const position = await readKoreaderReadingPosition(page)

      expect(position).toMatchObject({
        status: "success",
        spineItemIndex: Number(progress) - 1,
        progress,
      })
      await expectSpineItemsInViewport({
        page,
        indexes: [Number(progress) - 1],
      })
    }
  })

  test("going to the next page reports it", async ({ page }) => {
    for (let pageNumber = 2; pageNumber <= PAGE_COUNT; pageNumber++) {
      await goToNextSpineItem({ page })
      await expect
        .poll(async () => (await readKoreaderReadingPosition(page)).progress)
        .toBe(String(pageNumber))
    }
  })

  test("a page past the last, or an xpointer, goes nowhere", async ({
    page,
  }) => {
    await goToKoreaderProgress(page, "2")

    const before = await readKoreaderReadingPosition(page)

    await goToKoreaderProgress(page, String(PAGE_COUNT + 1))
    await goToKoreaderProgress(page, "/body/DocFragment[3]/body")

    expect(await readKoreaderReadingPosition(page)).toEqual(before)
  })
})
