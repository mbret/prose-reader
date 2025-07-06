import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { getScrollNavigationMetadata, waitForSpineItemReady } from "../../utils"

test.describe("Given a scroll mid page", () => {
  test.describe("and the user zoom out", () => {
    test.describe("and the user zoom back in", () => {
      test("should keep the previous un-zoomed position", async ({ page }) => {
        await page.setViewportSize({
          width: 454,
          height: 1294,
        })

        await page.goto("http://localhost:3333/tests/zoom/webtoon/index.html")

        await waitForSpineItemReady(page, [0])

        await page.evaluate(() => {
          // @ts-ignore
          const reader = window.reader as Reader

          reader.navigation.scrollNavigationController.value.element?.scrollTo({
            top: 6653,
            left: 0,
          })
        })

        await waitForSpineItemReady(page, [0, 1, 2])

        const previousScrollMetadata = await getScrollNavigationMetadata({
          page,
        })

        expect(previousScrollMetadata.scrollTop).toBe(6653)

        await page.evaluate(() => {
          // @ts-ignore
          const reader = window.reader as Reader

          reader.zoom.enter()
          reader.zoom.scaleAt(0.2)
        })

        await new Promise((resolve) => setTimeout(resolve, 500))

        const zoomedInScrollMetadata = await getScrollNavigationMetadata({
          page,
        })

        // zoomed out centered both x/y
        expect(zoomedInScrollMetadata.scrollTop).toBe(813)

        await page.evaluate(() => {
          // @ts-ignore
          const reader = window.reader as Reader

          reader.zoom.exit()
        })

        await new Promise((resolve) => setTimeout(resolve, 500))

        const { scrollLeft, scrollTop } = await getScrollNavigationMetadata({
          page,
        })

        expect(scrollLeft).toBe(previousScrollMetadata.scrollLeft)
        expect(scrollTop).toBe(previousScrollMetadata.scrollTop)
      })
    })
  })
})
