import { expect, test } from "@playwright/test"
import { navigateToSpineItem, waitForSpineItemReady } from "../../../utils"
import { waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

type PicturesWhenLoaded = {
  itemIndex: number
  images: {
    reference: string | null
    complete: boolean
    naturalWidth: number
  }[]
}

/**
 * The reader builds each page from a blob, so it swaps a blob url of its own
 * into each picture's reference once the page is in. `spi-ad.xhtml` has a
 * picture and no stylesheet, so nothing but its picture holds its load.
 */
test.describe("Given a chapter whose picture is swapped in after its page", () => {
  test("it is loaded once its picture has its size", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await (await getReader(page)).evaluate((reader) =>
      reader.context.manifest.spineItems.findIndex((item) =>
        item.href.endsWith("spi-ad.xhtml"),
      ),
    )

    expect(chapterIndex).toBeGreaterThanOrEqual(0)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSpineItemReady(page, [chapterIndex])

    const picturesWhenLoaded = await page.evaluate(() => {
      // @ts-expect-error window.picturesWhenLoaded is set by this scenario's index.tsx
      const values = window.picturesWhenLoaded as PicturesWhenLoaded[]

      return values
    })
    const chapterPictures =
      picturesWhenLoaded.find(({ itemIndex }) => itemIndex === chapterIndex)
        ?.images ?? []

    // The chapter loaded, with its picture swapped in.
    expect(chapterPictures).not.toHaveLength(0)

    for (const { reference } of chapterPictures) {
      expect(reference).toMatch(/^blob:/)
    }

    // No chapter reported loaded before each of its pictures had its size.
    const picturesWithoutSize = picturesWhenLoaded.flatMap(
      ({ itemIndex, images }) =>
        images
          .filter(
            ({ complete, naturalWidth }) => !complete || naturalWidth === 0,
          )
          .map((image) => ({ itemIndex, ...image })),
    )

    expect(picturesWithoutSize).toEqual([])
  })
})
