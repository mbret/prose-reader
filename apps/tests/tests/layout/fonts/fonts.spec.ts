import { expect, type Page, test } from "@playwright/test"
import {
  getLongChapterIndex,
  getNumberOfPagesOfSpineItem,
  navigateToSpineItem,
} from "../../utils"
import { layOutAndSettle, waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"

const url = "http://localhost:3333/tests/layout/fonts/index.html"

/** Whether bold text is wider than regular text in the chapter's body font. */
const isBoldWiderInBodyFont = async (page: Page, chapterIndex: number) =>
  (await getReader(page)).evaluate((reader, chapterIndex) => {
    const document = reader.spineItemsManager.get(chapterIndex)?.loadedDocument

    if (!document) throw new Error("the chapter is not loaded")

    const sample = document.createElement("span")

    sample.textContent = "The quick brown fox jumps over the lazy dog"
    sample.style.cssText = "position: absolute; white-space: nowrap"
    document.body.append(sample)

    const widthAt = (fontWeight: string) => {
      sample.style.fontWeight = fontWeight

      return sample.getBoundingClientRect().width
    }
    const isBoldWider = widthAt("900") > widthAt("400")

    sample.remove()

    return isBoldWider
  }, chapterIndex)

/**
 * Each case changes a fonts setting so that the text of a chapter takes more
 * lines, and so more pages.
 */
const cases = [
  {
    name: "its font scale grows, with a setting of another enhancer",
    // `layoutLayerTransition` lays nothing out by itself, so it cannot hide a
    // font scale change that fails to lay the chapter out.
    settings: { layoutLayerTransition: true, fontScale: 2 },
  },
  { name: "its line height grows", settings: { lineHeight: 2 } },
  {
    /**
     * The book's own font has no bold face, so a bolder weight may keep the
     * width of its glyphs. This case opens the book rewritten in the system
     * sans-serif font, which has a bold face with wider glyphs.
     */
    name: "its font weight grows",
    settings: { fontWeight: 900 },
    query: "?sansSerif",
    precondition: async (page: Page, chapterIndex: number) => {
      expect(
        await isBoldWiderInBodyFont(page, chapterIndex),
        "bold text is wider than regular text in the chapter's font",
      ).toBe(true)
    },
  },
] as const

test.describe("Given a reflowable chapter on screen", () => {
  for (const testCase of cases) {
    test(`should lay the chapter out again when ${testCase.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(`${url}${"query" in testCase ? testCase.query : ""}`)
      await waitForSettled(page)

      const chapterIndex = await getLongChapterIndex(page)

      await navigateToSpineItem({ page, index: chapterIndex })
      await waitForSettled(page)

      if ("precondition" in testCase) {
        await testCase.precondition(page, chapterIndex)
      }

      const numberOfPagesBefore = await getNumberOfPagesOfSpineItem(
        page,
        chapterIndex,
      )

      if (numberOfPagesBefore === undefined) {
        throw new Error("the chapter is not laid out")
      }

      await layOutAndSettle(page, { settings: testCase.settings })

      expect(
        await getNumberOfPagesOfSpineItem(page, chapterIndex),
        "the chapter's number of pages once its text takes more lines",
      ).toBeGreaterThan(numberOfPagesBefore)
    })
  }
})
