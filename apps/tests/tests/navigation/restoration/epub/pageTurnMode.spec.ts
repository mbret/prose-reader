import { expect } from "@playwright/test"
import { getLongChapterIndex } from "../../../utils"
import { layOutAndSettle, waitForSettled } from "../../../utils/pagination"
import { test } from "../../../utils/test"
import {
  readingPositionsSinceCreation,
  readPosition,
  turnPagesOfChapter,
} from "./position"

/**
 * The reading position is the place in the text the reader navigated to. A
 * change of page turn mode is not a navigation: the book moves to another
 * rendering layer, and the scrolls the browser reports of it meanwhile are
 * the reader's own.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

test.describe("Given a page after a chapter's first", () => {
  test.describe("When the page turn mode becomes scrollable, then controlled again", () => {
    test("Then the reading position has not moved, and the page is on screen again", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(url)
      await waitForSettled(page)

      const chapterIndex = await getLongChapterIndex(page)

      // to the chapter's fourth page
      await turnPagesOfChapter(page, chapterIndex, 3)

      const before = await readPosition(page)

      expect(before.spineItemIndex).toBe(chapterIndex)
      expect(before.pageIndex).toBe(3)
      expect(before.isRootCfi).toBe(false)
      expect(before.readingPosition).toBe(before.cfi)
      expect(before.readingPositionStatus).toBe("success")

      const numberOfReadingPositionsBefore = (
        await readingPositionsSinceCreation(page)
      ).length

      await layOutAndSettle(page, {
        settings: { pageTurnMode: "scrollable" },
      })
      await layOutAndSettle(page, {
        settings: { pageTurnMode: "controlled" },
      })

      const after = await readPosition(page)

      expect(after.readingPosition).toBe(before.readingPosition)
      expect(after.readingPositionStatus).toBe("success")
      expect(after.spineItemIndex).toBe(chapterIndex)
      expect(after.pageIndex).toBe(before.pageIndex)
      expect(
        await readingPositionsSinceCreation(page),
        "the reading positions since the reader's creation",
      ).toHaveLength(numberOfReadingPositionsBefore)
    })
  })
})
