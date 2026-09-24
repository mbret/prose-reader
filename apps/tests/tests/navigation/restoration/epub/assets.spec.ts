import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSpineItemReady } from "../../../utils"
import { waitForSettled } from "../../../utils/pagination"

/**
 * `ch03s03.xhtml` links PLS pronunciation lexicons, which a browser never
 * fetches, so they must not hold the chapter.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

test.describe("Given a chapter linking pronunciation lexicons", () => {
  test("it opens, with its stylesheet's fonts", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      return reader.context.manifest.spineItems.findIndex((item) =>
        item.href.endsWith("ch03s03.xhtml"),
      )
    })

    expect(chapterIndex).toBeGreaterThan(0)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

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
