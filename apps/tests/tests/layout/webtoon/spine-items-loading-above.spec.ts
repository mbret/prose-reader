import { test } from "@playwright/test"
import {
  expectEveryFrameToShowStartOfSpineItemWhile,
  goToSpineItemWithOnesBeforeItStillLoading,
} from "../../utils/spineItems"

test.describe("Given a book that scrolls, at the top of a spine item with the two above it still loading", () => {
  test.describe("When the two above finish loading", () => {
    test("every frame shows the top of that spine item", async ({ page }) => {
      await page.setViewportSize({ width: 300, height: 400 })
      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

      /**
       * A spine item of this book is one screen tall until its image loads,
       * and more than three after: the two that load above move the ones
       * after them down.
       */
      const spineItemIndex = 6
      const letSpineItemsAboveFinishLoading =
        await goToSpineItemWithOnesBeforeItStillLoading(page, {
          spineItemIndex,
          spineItemIndexesLoadingBefore: [4, 5],
        })

      await expectEveryFrameToShowStartOfSpineItemWhile(
        page,
        spineItemIndex,
        letSpineItemsAboveFinishLoading,
      )
    })
  })
})
