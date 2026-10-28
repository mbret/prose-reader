import { expect, type Page, test } from "@playwright/test"
import { expectSpineItemsInViewport, goToNextSpineItem } from "../../utils"
import {
  goToKoreaderProgress,
  readKoreaderReadingPosition,
} from "../../utils/koreader"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"

/**
 * A KOReader sync client on a comic pushes and pulls page numbers: the place
 * of the image shown among the archive's images, a split panorama counting
 * once. The enhancer takes prose's reading order for KOReader's (#535); the
 * fixture's images are named so that the two agree, and MuPDF, which KOReader
 * opens comics with, opens it with these pages
 * (`packages/koreader/tools/build_page_fixtures.py`).
 */

const url = "http://localhost:3333/tests/koreader/comic/index.html"

/** The image KOReader shows on each page, page 1 first. */
const KOREADER_PAGES = [
  "p01.jpg",
  "p02.jpg",
  "p03.jpg",
  "p04-05.jpg",
  "p06.jpg",
  "p07.jpg",
  "p08-09.jpg",
]

/**
 * The panoramas the cbz streamer hooks split in two spine items. Past the
 * first, a half's spine index is not the panorama's place among the images,
 * which the cbz enhancer writes in its cfi.
 */
const PANORAMAS = ["p04-05.jpg", "p08-09.jpg"]

/** KOReader's page of the record a spine item shows, as it pushes it. */
const koreaderPageOf = (containerUri: string | undefined) => {
  const index = KOREADER_PAGES.indexOf(containerUri ?? "")

  return index < 0 ? undefined : String(index + 1)
}

const getSpineItemCount = async (page: Page) =>
  (await getReader(page)).evaluate(
    (reader) => reader.spineItemsManager.items.length,
  )

test.beforeEach(async ({ page }) => {
  // Portrait, so every spine item is a page of its own.
  await page.setViewportSize({ width: 690, height: 1294 })
  await page.goto(url)
  await waitForSettled(page)
})

test.describe("Given a comic with split panoramas", () => {
  test("going to each KOReader page shows its image, and reports that page", async ({
    page,
  }) => {
    for (const [index, containerUri] of KOREADER_PAGES.entries()) {
      const progress = String(index + 1)

      await goToKoreaderProgress(page, progress)

      const position = await readKoreaderReadingPosition(page)

      expect(position.containerUri, `page ${progress}`).toBe(containerUri)
      expect(position).toMatchObject({ status: "success", progress })
      await expectSpineItemsInViewport({
        page,
        indexes: [position.spineItemIndex ?? -1],
      })
    }
  })

  test("going through every spine item, the reported page is the image shown, both halves of a panorama included", async ({
    page,
  }) => {
    const spineItemCount = await getSpineItemCount(page)
    // Every image, each panorama twice.
    expect(spineItemCount).toBe(KOREADER_PAGES.length + PANORAMAS.length)

    const shown = [await readKoreaderReadingPosition(page)]

    for (let turn = 1; turn < spineItemCount; turn++) {
      await goToNextSpineItem({ page })
      await expect
        .poll(
          async () => (await readKoreaderReadingPosition(page)).spineItemIndex,
        )
        .toBe(turn)
      await waitForSettled(page)
      shown.push(await readKoreaderReadingPosition(page))
    }

    for (const position of shown) {
      expect(position.progress, `progress on ${position.containerUri}`).toBe(
        koreaderPageOf(position.containerUri),
      )
    }

    for (const panorama of PANORAMAS) {
      const progress = koreaderPageOf(panorama)

      expect(
        shown.filter(({ containerUri }) => containerUri === panorama),
      ).toMatchObject([{ progress }, { progress }])
    }
  })

  test("a page the book does not have goes nowhere", async ({ page }) => {
    await goToKoreaderProgress(page, "3")

    const before = await readKoreaderReadingPosition(page)

    await goToKoreaderProgress(page, String(KOREADER_PAGES.length + 1))

    expect(await readKoreaderReadingPosition(page)).toEqual(before)
  })
})
