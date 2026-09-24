import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSpineItemReady } from "../../../utils"
import { navigateAndSettle, waitForReader } from "../../../utils/pagination"

/**
 * `ch03s03.xhtml` attaches PLS pronunciation lexicons for text-to-speech,
 * which is valid EPUB 3. A browser never fetches a `pronunciation` link, so
 * no `load` or `error` ever comes for one, and the chapter must open without
 * waiting on it. Its stylesheet declares the book's fonts, which the reader
 * points at the archive once the stylesheet has loaded.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

test.describe("Given a chapter linking pronunciation lexicons", () => {
  test("it opens, with its stylesheet's fonts", async ({ page }) => {
    await page.goto(url)
    await waitForReader(page)

    const chapterIndex = await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      return reader.context.manifest.spineItems.findIndex((item) =>
        item.href.endsWith("ch03s03.xhtml"),
      )
    })

    expect(chapterIndex).toBeGreaterThan(0)

    await navigateAndSettle(page, () =>
      page.evaluate((indexOrId) => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.goToSpineItem({ indexOrId })
      }, chapterIndex),
    )

    await waitForSpineItemReady(page, [chapterIndex])

    const frame = page
      .locator(`.spineItem:nth-child(${chapterIndex + 1}) iframe`)
      .contentFrame()

    await expect(
      frame.getByRole("heading", {
        name: "Tell It Like It Is: Text-to-Speech (TTS)",
      }),
    ).toBeInViewport()

    const bodyFontStatus = await frame.locator("body").evaluate((body) => {
      const faces: FontFace[] = []

      body.ownerDocument.fonts.forEach((face) => {
        faces.push(face)
      })

      const face = faces.find(
        ({ family }) => family.replace(/["']/g, "") === "Free Serif",
      )

      if (!face) return "no Free Serif font face"

      return face.load().then(
        () => face.status,
        () => face.status,
      )
    })

    expect(bodyFontStatus).toBe("loaded")
  })
})
