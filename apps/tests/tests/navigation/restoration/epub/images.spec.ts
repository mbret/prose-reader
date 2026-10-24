import { expect, type Page, test } from "@playwright/test"
import { waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

type ChapterImagesWhenLoaded = {
  itemIndex: number
  images: {
    reference: string | null
    complete: boolean
    naturalWidth: number
    offsetTop: number
  }[]
}

/**
 * Goes to the chapter whose href ends with `href`, and gives the images of each
 * chapter as it reports loaded, until that one has.
 */
const goToChapterRecordingImages = async (page: Page, href: string) =>
  (await getReader(page)).evaluate(
    (reader, href) =>
      new Promise<{
        chapterIndex: number
        loadStatusBeforeNavigation: string | undefined
        imagesWhenLoaded: ChapterImagesWhenLoaded[]
      }>((resolve) => {
        const chapterIndex = reader.context.manifest.spineItems.findIndex(
          (item) => item.href.endsWith(href),
        )
        const loadStatusBeforeNavigation =
          reader.spineItemsManager.get(chapterIndex)?.value.loadStatus
        const imagesWhenLoaded: ChapterImagesWhenLoaded[] = []

        if (loadStatusBeforeNavigation !== "idle") {
          resolve({
            chapterIndex,
            loadStatusBeforeNavigation,
            imagesWhenLoaded,
          })

          return
        }

        reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
          ({ item, loadStatus }) => {
            if (loadStatus !== "loaded") return

            imagesWhenLoaded.push({
              itemIndex: item.index,
              images: Array.from(
                item.loadedDocument?.images ?? [],
                (image) => ({
                  reference: image.getAttribute("src"),
                  complete: image.complete,
                  naturalWidth: image.naturalWidth,
                  offsetTop: image.offsetTop,
                }),
              ),
            })

            if (item.index === chapterIndex) {
              resolve({
                chapterIndex,
                loadStatusBeforeNavigation,
                imagesWhenLoaded,
              })
            }
          },
        )

        reader.navigation.goToSpineItem({ indexOrId: chapterIndex })
      }),
    href,
  )

const expectEachImageSized = (imagesWhenLoaded: ChapterImagesWhenLoaded[]) => {
  const imagesWithoutSize = imagesWhenLoaded.flatMap(({ itemIndex, images }) =>
    images
      .filter(({ complete, naturalWidth }) => !complete || naturalWidth === 0)
      .map((image) => ({ itemIndex, ...image })),
  )

  expect(imagesWithoutSize).toEqual([])
}

/**
 * The reader swaps a blob url of its own into each image once the chapter's
 * page is in.
 */
test.describe("Given a chapter whose image is swapped in after its page", () => {
  /**
   * `spi-ad.xhtml` has an image and no stylesheet, so nothing but its image
   * holds its load.
   */
  test("it is loaded once its image has its size", async ({ page }) => {
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)

    const { chapterIndex, loadStatusBeforeNavigation, imagesWhenLoaded } =
      await goToChapterRecordingImages(page, "spi-ad.xhtml")
    const chapterImages =
      imagesWhenLoaded.find(({ itemIndex }) => itemIndex === chapterIndex)
        ?.images ?? []

    expect(chapterIndex).toBeGreaterThanOrEqual(0)
    expect(loadStatusBeforeNavigation).toBe("idle")
    expect(chapterImages).not.toHaveLength(0)

    for (const { reference } of chapterImages) {
      expect(reference).toMatch(/^blob:/)
    }

    expectEachImageSized(imagesWhenLoaded)
  })

  /**
   * A lazy image loads once it nears the viewport. The scenario's `lazyImages`
   * puts each image far below where its page starts.
   */
  test("it is loaded once its lazy image has its size", async ({ page }) => {
    await page.goto(`${url}?preload=0&lazyImages`)
    await waitForSettled(page)

    const { chapterIndex, loadStatusBeforeNavigation, imagesWhenLoaded } =
      await goToChapterRecordingImages(page, "ch04.xhtml")
    const chapterImages =
      imagesWhenLoaded.find(({ itemIndex }) => itemIndex === chapterIndex)
        ?.images ?? []

    expect(chapterIndex).toBeGreaterThanOrEqual(0)
    expect(loadStatusBeforeNavigation).toBe("idle")
    expect(chapterImages).not.toHaveLength(0)

    for (const { offsetTop } of chapterImages) {
      expect(offsetTop).toBeGreaterThanOrEqual(10_000)
    }

    expectEachImageSized(imagesWhenLoaded)
  })
})
