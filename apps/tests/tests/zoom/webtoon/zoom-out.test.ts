import { expect, test } from "@playwright/test"
import {
  getScrollNavigationMetadata,
  waitForSpineItemReady,
  zoomAt,
} from "../../utils"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"

const scales = [0.2, 0.5, 1]
const height = 1294
const scrollTop = 6653

test.describe("Given a scroll mid page", () => {
  scales.forEach((scale) => {
    test.describe(`and the user zoom out by ${scale}`, () => {
      test.describe("and the user zoom back in", () => {
        test("should keep the previous un-zoomed position", async ({
          page,
        }) => {
          await page.setViewportSize({
            width: 454,
            height,
          })

          await page.goto("http://localhost:3333/tests/zoom/webtoon/index.html")

          await waitForSpineItemReady(page, [0])

          const reader = await getReader(page)

          await reader.evaluate((reader, top) => {
            reader.navigation.scrollNavigationController.value.element?.scrollTo(
              { top, left: 0 },
            )
          }, scrollTop)

          await waitForSpineItemReady(page, [0, 1, 2, 3, 4, 5])

          const previousScrollMetadata = await getScrollNavigationMetadata({
            page,
          })

          expect(previousScrollMetadata.scrollTop).toBe(scrollTop)

          // Scaling re-centers the scroll position with a navigation, and
          // lays out again.
          await zoomAt({ page, scale })

          await waitForSettled(page)

          const zoomedInScrollMetadata = await getScrollNavigationMetadata({
            page,
          })

          // zoomed out centered both x/y
          expect(zoomedInScrollMetadata.scrollTop).toBe(
            (scrollTop + height / 2) * scale - height / 2,
          )

          await reader.evaluate((reader) => {
            reader.zoom.exit()
          })

          await waitForSettled(page)

          const {
            scrollLeft: zoomedOutScrollLeft,
            scrollTop: zoomedOutScrollTop,
          } = await getScrollNavigationMetadata({
            page,
          })

          expect(zoomedOutScrollLeft).toBe(previousScrollMetadata.scrollLeft)
          expect(zoomedOutScrollTop).toBe(previousScrollMetadata.scrollTop)
        })
      })
    })
  })
})
