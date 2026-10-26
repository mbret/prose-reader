import { expect, test } from "@playwright/test"
import { updateSettings } from "../../utils"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/layout/fonts/index.html"

test.describe("Given a reflowable chapter on screen", () => {
  test("should lay the chapter out again when its font scale changes with a setting of another enhancer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(`${url}?cfi=${encodeURIComponent("epubcfi(/6/14!/4/2)")}`)

    const reader = await getReader(page)

    await page.waitForFunction(
      (reader) =>
        reader.pagination.state.isSettled && reader.spine.isLayoutCurrent,
      reader,
    )

    const chapterAtFontScale1 = await reader.evaluate((reader) => {
      const { spineItemIndex, numberOfPagesInSpineItem } =
        reader.pagination.state.begin

      return {
        spineItemIndex,
        numberOfPages: numberOfPagesInSpineItem,
        layoutLayerTransition: reader.settings.values.layoutLayerTransition,
      }
    })

    expect(chapterAtFontScale1.layoutLayerTransition).toBe(false)

    // `layoutLayerTransition` lays nothing out by itself, so it cannot hide a
    // font scale change that fails to lay the chapter out.
    await updateSettings({
      page,
      settings: { layoutLayerTransition: true, fontScale: 2 },
    })

    await expect
      .poll(() =>
        reader.evaluate(
          (reader, spineItemIndex) =>
            reader.spineItemsManager.get(spineItemIndex)?.numberOfPages,
          chapterAtFontScale1.spineItemIndex,
        ),
      )
      .toBeGreaterThan(chapterAtFontScale1.numberOfPages)
  })
})
