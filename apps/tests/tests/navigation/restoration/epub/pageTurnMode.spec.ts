import { expect, type Page, test } from "@playwright/test"
import type { ReadingPosition } from "@prose-reader/core"
import { navigateToSpineItem } from "../../../utils"
import { layOutAndRestore, waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { getLongChapterIndex, readPosition } from "./position"

/**
 * The reading position is the place in the text the reader navigated to. A
 * change of page turn mode is not a navigation: the book moves to another
 * rendering layer, and the scrolls the browser reports of it meanwhile are
 * the reader's own.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/** Turns to the fourth page of a chapter. */
const turnThreePages = async (page: Page, chapterIndex: number) => {
  const reader = await getReader(page)

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSettled(page)

  for (let turn = 0; turn < 3; turn++) {
    await reader.evaluate((reader) => {
      reader.navigation.turnRight()
    })
    await waitForSettled(page)
  }
}

/** Every reading position since the reader's creation, see `index.tsx`. */
const countReadingPositions = (page: Page) =>
  page.evaluate(() => {
    const { readingPositions } = window as unknown as {
      readingPositions: ReadingPosition[]
    }

    return readingPositions.length
  })

test.describe("Given a page after a chapter's first", () => {
  test.describe("When the page turn mode becomes scrollable, then controlled again", () => {
    test("Then the reading position has not moved, and the page is on screen again", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(url)
      await waitForSettled(page)

      const chapterIndex = await getLongChapterIndex(page)

      await turnThreePages(page, chapterIndex)

      const before = await readPosition(page)

      expect(before.spineItemIndex).toBe(chapterIndex)
      expect(before.pageIndex).toBe(3)
      expect(before.isRootCfi).toBe(false)
      expect(before.readingPosition).toBe(before.cfi)
      expect(before.readingPositionStatus).toBe("success")

      const numberOfReadingPositionsBefore = await countReadingPositions(page)

      await layOutAndRestore(page, {
        settings: { pageTurnMode: "scrollable" },
      })
      await layOutAndRestore(page, {
        settings: { pageTurnMode: "controlled" },
      })

      const after = await readPosition(page)

      expect(after.readingPosition).toBe(before.readingPosition)
      expect(after.readingPositionStatus).toBe("success")
      expect(after.spineItemIndex).toBe(chapterIndex)
      expect(after.pageIndex).toBe(before.pageIndex)
      expect(
        await countReadingPositions(page),
        "the number of reading positions since the reader's creation",
      ).toBe(numberOfReadingPositionsBefore)
    })
  })
})
