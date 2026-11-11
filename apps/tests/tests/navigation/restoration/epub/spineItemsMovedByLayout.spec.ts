import { expect, test } from "@playwright/test"
import {
  getLongChapterIndex,
  getNumberOfPagesOfSpineItem,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../../../utils"
import {
  layOutAndSettle,
  waitForSettledOnCurrentLayout,
} from "../../../utils/pagination"
import { expectEveryFrameToShowStartOfSpineItemWhile } from "../../../utils/spineItems"

test.describe("Given a book whose pages turn, at the start of a chapter that follows chapters of several pages", () => {
  test.describe("When a larger font gives the chapters before it more pages", () => {
    test("every frame shows the start of that chapter", async ({ page }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(
        "http://localhost:3333/tests/navigation/restoration/epub/index.html",
      )
      await waitForSettledOnCurrentLayout(page)

      const longChapterIndex = await getLongChapterIndex(page)
      const chapterBeforeIndex = longChapterIndex - 1

      await navigateToSpineItem({ page, index: longChapterIndex })
      await waitForSpineItemReady(page, [chapterBeforeIndex, longChapterIndex])
      await waitForSettledOnCurrentLayout(page)

      // More than one page: a larger font can give it one more.
      expect(
        await getNumberOfPagesOfSpineItem(page, chapterBeforeIndex),
      ).toBeGreaterThan(1)

      await expectEveryFrameToShowStartOfSpineItemWhile(
        page,
        longChapterIndex,
        async () => {
          await layOutAndSettle(page, { settings: { fontScale: 1.5 } })
          await waitForSettledOnCurrentLayout(page)
        },
      )
    })
  })
})
