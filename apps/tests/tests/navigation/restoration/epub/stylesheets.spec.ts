import { expect } from "@playwright/test"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"
import type { ChapterDocumentWhenLoaded } from "./chapterDocumentsWhenLoaded"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

const tableOfContentsSpineItemIndex = 3

/**
 * The book's chapters link the same stylesheet, `css/epub.css`, which declares
 * the fonts of their text, such as "Free Serif". Opened at its start, the
 * reader loads the first chapter and the three after it at once. Loaded by
 * url, all but one get the stylesheet from a request another made, and WebKit
 * fired such a chapter's `load` before its stylesheet was in. Loaded either
 * way, WebKit settled `document.fonts.ready` while a font was still loading.
 * The reader then laid the chapter out, and restored a cfi onto it, in a
 * fallback font.
 */
test.describe("Given chapters linking the same stylesheet, loading at once", () => {
  test("each is loaded once its stylesheet and the font its text uses are in", async ({
    page,
  }) => {
    await page.goto(`${url}?preload=3`)

    const reader = await getReader(page)

    await expect
      .poll(() =>
        reader.evaluate(
          (reader, lastIndex) =>
            reader.spineItemsManager.items
              .slice(0, lastIndex + 1)
              .map(({ value }) => value.loadStatus),
          tableOfContentsSpineItemIndex,
        ),
      )
      .toEqual(["loaded", "loaded", "loaded", "loaded"])

    const chapterDocuments = await page.evaluate(
      () =>
        // The page's window is untyped: the scenario's index.tsx records them.
        (
          window as unknown as {
            chapterDocumentsWhenLoaded: ChapterDocumentWhenLoaded[]
          }
        ).chapterDocumentsWhenLoaded,
    )
    const tableOfContents = chapterDocuments.find(
      ({ itemIndex }) => itemIndex === tableOfContentsSpineItemIndex,
    )

    // Loaded from a blob, its reference is the blob url the reader swapped in.
    expect(tableOfContents?.stylesheets).toHaveLength(1)

    const missingWhenLoaded = chapterDocuments.flatMap(
      ({ itemIndex, stylesheets, fonts }) => [
        ...stylesheets
          .filter(({ hasSheet }) => !hasSheet)
          .map(({ reference }) => ({ itemIndex, stylesheet: reference })),
        ...fonts
          .filter(({ status }) => status === "loading")
          .map(({ family }) => ({ itemIndex, loadingFont: family })),
      ],
    )

    expect(missingWhenLoaded).toEqual([])
    expect(tableOfContents?.fonts).toContainEqual({
      family: "Free Serif",
      status: "loaded",
    })
  })
})
