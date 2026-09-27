import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  locateSpineItemFrame,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../utils"
import { waitForSettled } from "../utils/pagination"
import {
  DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING,
  describeResourceLoading,
  RESOURCE_LOADINGS,
  withResourceLoading,
} from "../utils/resourceLoading"

const url = "http://localhost:3333/tests/prepaginated/index.html"

/**
 * `pageNum-10.xhtml`, whose page is an SVG `<image>` referencing its picture,
 * `img-3.jpg` (924×1458), with an XLink href relative to the page.
 */
const SVG_IMAGE_PAGE_SPINE_ITEM_INDEX = 7

for (const resourceLoading of RESOURCE_LOADINGS) {
  test.describe(`Given a prepaginated book with a page drawn as an SVG image, ${describeResourceLoading(resourceLoading)}`, () => {
    test("should load the picture the image references", async ({ page }) => {
      await page.goto(withResourceLoading(url, resourceLoading))
      await waitForSettled(page)

      const pageHref = await page.evaluate((index) => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        return reader.context.manifest.spineItems[index]?.href
      }, SVG_IMAGE_PAGE_SPINE_ITEM_INDEX)

      expect(pageHref).toMatch(/\/pageNum-10\.xhtml$/)

      await navigateToSpineItem({
        page,
        index: SVG_IMAGE_PAGE_SPINE_ITEM_INDEX,
      })
      await waitForSpineItemReady(page, [SVG_IMAGE_PAGE_SPINE_ITEM_INDEX])

      const frame = await locateSpineItemFrame(
        page,
        SVG_IMAGE_PAGE_SPINE_ITEM_INDEX,
      )
      const { documentProtocol, picture } = await frame
        .contentFrame()
        .locator("image")
        .evaluate(async (image: SVGImageElement) => {
          // The reference as the browser reads it, whichever attribute holds
          // it, resolved against the page as the image resolves it.
          const probe = new Image()

          probe.src = image.href.baseVal

          const picture = await probe.decode().then(
            () => ({ width: probe.naturalWidth, height: probe.naturalHeight }),
            () => `the picture did not load from ${image.href.baseVal}`,
          )

          return { documentProtocol: new URL(document.URL).protocol, picture }
        })

      /**
       * Loaded from a blob, the page's relative reference resolves to nothing
       * unless the reader resolves it; loaded from its url, the browser does.
       */
      expect(documentProtocol).toBe(
        DOCUMENT_PROTOCOL_BY_RESOURCE_LOADING[resourceLoading],
      )
      expect(picture).toEqual({ width: 924, height: 1458 })
    })
  })
}
