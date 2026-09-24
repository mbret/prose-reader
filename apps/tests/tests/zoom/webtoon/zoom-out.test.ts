import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { getScrollNavigationMetadata, waitForSpineItemReady } from "../../utils"
import { navigateAndSettle } from "../../utils/pagination"

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

          await page.evaluate(
            ([_scrollTop = 0]) => {
              // @ts-expect-error
              const reader = window.reader as Reader

              reader.navigation.scrollNavigationController.value.element?.scrollTo(
                {
                  top: _scrollTop,
                  left: 0,
                },
              )
            },
            [scrollTop],
          )

          await waitForSpineItemReady(page, [0, 1, 2, 3, 4, 5])

          const previousScrollMetadata = await getScrollNavigationMetadata({
            page,
          })

          expect(previousScrollMetadata.scrollTop).toBe(scrollTop)

          // Scaling re-centers the scroll position with a navigation, and
          // lays out again.
          await navigateAndSettle(page, () =>
            page.evaluate(
              ([_scale = 1]) => {
                // @ts-expect-error
                const reader = window.reader as Reader

                reader.zoom.enter()
                reader.zoom.scaleAt(_scale)
              },
              [scale],
            ),
          )

          // zoomed out centered both x/y
          await expect
            .poll(
              async () =>
                (await getScrollNavigationMetadata({ page })).scrollTop,
            )
            .toBe((scrollTop + height / 2) * scale - height / 2)

          await navigateAndSettle(page, () =>
            page.evaluate(() => {
              // @ts-expect-error
              const reader = window.reader as Reader

              reader.zoom.exit()
            }),
          )

          await expect
            .poll(async () => {
              const { scrollLeft, scrollTop } =
                await getScrollNavigationMetadata({ page })

              return { scrollLeft, scrollTop }
            })
            .toEqual({
              scrollLeft: previousScrollMetadata.scrollLeft,
              scrollTop: previousScrollMetadata.scrollTop,
            })
        })
      })
    })
  })
})
