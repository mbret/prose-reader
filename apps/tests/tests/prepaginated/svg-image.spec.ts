import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  locateSpineItemFrame,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../utils"
import { waitForSettled } from "../utils/pagination"

/**
 * `pageNum-10.xhtml`, whose page is an SVG `<image>` referencing its picture,
 * `img-3.jpg` (924×1458), with an XLink href relative to the page.
 */
const SVG_IMAGE_PAGE_SPINE_ITEM_INDEX = 7

test.describe("Given a prepaginated book with a page drawn as an SVG image", () => {
  test("should load the picture the image references", async ({ page }) => {
    await page.goto("http://localhost:3333/tests/prepaginated/index.html")
    await waitForSettled(page)

    const pageHref = await page.evaluate((index) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      return reader.context.manifest.spineItems[index]?.href
    }, SVG_IMAGE_PAGE_SPINE_ITEM_INDEX)

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
})
