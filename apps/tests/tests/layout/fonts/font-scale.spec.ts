import { expect, test } from "@playwright/test"
import { updateSettings } from "../../utils"
import { waitForSettledOnCurrentLayout } from "../../utils/pagination"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/layout/fonts/index.html"
const chapterCfi = "epubcfi(/6/14!/4/2)"
const chapterSpineItemIndex = 6

test.describe("Given a reflowable chapter on screen", () => {
  test("should lay the chapter out again when its font scale changes with a setting of another enhancer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(`${url}?cfi=${encodeURIComponent(chapterCfi)}`)
    await waitForSettledOnCurrentLayout(page)

    const reader = await getReader(page)
    const getNumberOfPagesOfChapter = () =>
      reader.evaluate(
        (reader, spineItemIndex) =>
          reader.spineItemsManager.get(spineItemIndex)?.numberOfPages,
        chapterSpineItemIndex,
      )

    const chapterBeforeUpdate = await reader.evaluate((reader) => ({
      spineItemIndex: reader.pagination.state.begin.spineItemIndex,
      layoutLayerTransition: reader.settings.values.layoutLayerTransition,
    }))

    expect(chapterBeforeUpdate).toEqual({
      spineItemIndex: chapterSpineItemIndex,
      layoutLayerTransition: false,
    })

    const numberOfPagesAtFontScale1 = await getNumberOfPagesOfChapter()

    if (numberOfPagesAtFontScale1 === undefined) {
      throw new Error(`the chapter is not laid out`)
    }

    // `layoutLayerTransition` lays nothing out by itself, so it cannot hide a
    // font scale change that fails to lay the chapter out.
    await updateSettings({
      page,
      settings: { layoutLayerTransition: true, fontScale: 2 },
    })

    await expect
      .poll(getNumberOfPagesOfChapter)
      .toBeGreaterThan(numberOfPagesAtFontScale1)
  })
})
