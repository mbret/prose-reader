import { expect, test } from "@playwright/test"
import {
  locateSpineItemFrame,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../utils"
import { waitForSettled } from "../utils/pagination"
import { getReader } from "../utils/reader"

/**
 * `pageNum-10.xhtml`, whose page is an SVG `<image>` referencing its picture,
 * `img-3.jpg` (924×1458), with an XLink href relative to the page.
 */
const SVG_IMAGE_PAGE_SPINE_ITEM_INDEX = 7

test.describe("Given a prepaginated book with a page drawn as an SVG image", () => {
  test("should load the picture the image references", async ({ page }) => {
    await page.goto("http://localhost:3333/tests/prepaginated/index.html")
    await waitForSettled(page)

    const pageHref = await (await getReader(page)).evaluate(
      (reader, index) => reader.context.manifest.spineItems[index]?.href,
      SVG_IMAGE_PAGE_SPINE_ITEM_INDEX,
    )

    expect(pageHref).toMatch(/\/pageNum-10\.xhtml$/)

    await navigateToSpineItem({ page, index: SVG_IMAGE_PAGE_SPINE_ITEM_INDEX })
    await waitForSpineItemReady(page, [SVG_IMAGE_PAGE_SPINE_ITEM_INDEX])

    const frame = await locateSpineItemFrame(
      page,
      SVG_IMAGE_PAGE_SPINE_ITEM_INDEX,
    )
    const { documentProtocol, picture } = await frame
      .contentFrame()
      .locator("image")
      .evaluate(async (image: SVGImageElement) => {
        // The reference as the browser reads it, whichever attribute holds it,
        // resolved against the page as the image resolves it.
        const probe = new Image()

        probe.src = image.href.baseVal

        const picture = await probe.decode().then(
          () => ({ width: probe.naturalWidth, height: probe.naturalHeight }),
          () => `the picture did not load from ${image.href.baseVal}`,
        )

        return { documentProtocol: new URL(document.URL).protocol, picture }
      })

    // A reference relative to a page loaded from a blob resolves to nothing.
    expect(documentProtocol).toBe("blob:")
    expect(picture).toEqual({ width: 924, height: 1458 })
  })

  /**
   * Without its stylesheet, nothing but the picture holds the page's load. The
   * reader warns of an asset it could not load or gave up waiting for, once
   * debugging is on before it is created.
   */
  test("should report the page loaded once its picture can be drawn", async ({
    page,
  }) => {
    const assetWarnings: string[] = []

    page.on("console", (message) => {
      if (message.text().includes("Could not load asset")) {
        assetWarnings.push(message.text())
      }
    })
    await page.addInitScript(() => {
      window.__PROSE_READER_DEBUG = true
    })
    await page.goto(
      "http://localhost:3333/tests/prepaginated/index.html?withoutStylesheets",
    )
    await waitForSettled(page)

    const pageLoad = await (await getReader(page)).evaluate(
      (reader, index) =>
        new Promise<{
          loadStatusBeforeNavigation: string | undefined
          pictureAlpha: number | string
        }>((resolve) => {
          const loadStatusBeforeNavigation =
            reader.spineItemsManager.get(index)?.value.loadStatus

          reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
            ({ item, loadStatus }) => {
              if (item.index !== index || loadStatus !== "loaded") return

              const image = item.loadedDocument?.querySelector("image")
              const canvas = document.createElement("canvas")
              const context = canvas.getContext("2d")
              let pictureAlpha: number | string

              canvas.width = 1
              canvas.height = 1

              try {
                if (!image || !context) throw new Error("no image or canvas")

                // A picture not loaded yet draws nothing.
                context.drawImage(image, 0, 0, 1, 1)
                pictureAlpha = context.getImageData(0, 0, 1, 1).data[3] ?? 0
              } catch (error) {
                pictureAlpha = String(error)
              }

              resolve({ loadStatusBeforeNavigation, pictureAlpha })
            },
          )

          reader.navigation.goToSpineItem({ indexOrId: index })
        }),
      SVG_IMAGE_PAGE_SPINE_ITEM_INDEX,
    )

    expect(pageLoad.loadStatusBeforeNavigation).toBe("idle")
    // `img-3.jpg` is opaque.
    expect(pageLoad.pictureAlpha).toBe(255)
    expect(assetWarnings).toEqual([])
  })
})
