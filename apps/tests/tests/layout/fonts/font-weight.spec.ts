import { expect, test } from "@playwright/test"
import { updateSettings } from "../../utils"
import {
  layOutAndSettle,
  waitForSettledOnCurrentLayout,
} from "../../utils/pagination"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/layout/fonts/index.html"
// `ch02.xhtml`, a chapter of many pages
const chapterCfi = "epubcfi(/6/24!)"
const chapterSpineItemIndex = 11

/**
 * The book's own font has no bold face: a browser draws a bolder weight of it
 * with the regular glyphs, as wide as before, and the text keeps its lines. A
 * system sans-serif font has one, with wider glyphs, so the chapter is set in
 * it.
 */
test.describe("Given a reflowable chapter set in a font with a bold face", () => {
  test("should lay the chapter out again when the font weight changes", async ({
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

    expect(
      await reader.evaluate(
        (reader) => reader.pagination.state.begin.spineItemIndex,
      ),
    ).toBe(chapterSpineItemIndex)

    const widths = await reader.evaluate((reader, spineItemIndex) => {
      const document =
        reader.spineItemsManager.get(spineItemIndex)?.loadedDocument

      if (!document) throw new Error("the chapter is not loaded")

      const style = document.createElement("style")

      style.textContent = "body, body * { font-family: sans-serif !important; }"
      document.head.append(style)

      const sample = document.createElement("span")

      sample.textContent = "The quick brown fox jumps over the lazy dog"
      sample.style.cssText = "position: absolute; white-space: nowrap"
      document.body.append(sample)

      const widthAt = (fontWeight: string) => {
        sample.style.fontWeight = fontWeight

        return sample.getBoundingClientRect().width
      }
      const widths = { regular: widthAt("400"), bold: widthAt("900") }

      sample.remove()

      return widths
    }, chapterSpineItemIndex)

    expect(widths.bold, "the width of bold text in the font").toBeGreaterThan(
      widths.regular,
    )

    await layOutAndSettle(page)

    const numberOfPagesAtRegularWeight = await getNumberOfPagesOfChapter()

    if (numberOfPagesAtRegularWeight === undefined) {
      throw new Error("the chapter is not laid out")
    }

    await updateSettings({ page, settings: { fontWeight: 900 } })

    await expect
      .poll(getNumberOfPagesOfChapter, {
        message: "the chapter's number of pages once its text is bold",
      })
      .toBeGreaterThan(numberOfPagesAtRegularWeight)

    const numberOfPagesAtBoldWeight = await getNumberOfPagesOfChapter()

    // The layout the weight change ran found every page: one more finds none.
    await layOutAndSettle(page)

    expect(await getNumberOfPagesOfChapter()).toBe(numberOfPagesAtBoldWeight)
  })
})
