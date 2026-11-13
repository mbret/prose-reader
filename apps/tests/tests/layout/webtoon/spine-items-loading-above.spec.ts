import { expect, test } from "@playwright/test"
import { getReader } from "../../utils/reader"
import {
  expectEveryFrameToShowStartOfSpineItemWhile,
  expectEveryFrameToShowWhereUserScrollsInSpineItemWhile,
  goToSpineItemWithOnesBeforeItStillLoading,
} from "../../utils/spineItems"

test.describe("Given a book that scrolls, at the top of a spine item with the two above it still loading", () => {
  test.describe("When the two above finish loading", () => {
    test("every frame shows the top of that spine item", async ({ page }) => {
      await page.setViewportSize({ width: 300, height: 400 })
      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

      /**
       * A spine item of this book is one screen tall until its image loads,
       * and more than three after: the two that load above move the ones
       * after them down.
       */
      const spineItemIndex = 6
      const letSpineItemsAboveFinishLoading =
        await goToSpineItemWithOnesBeforeItStillLoading(page, {
          spineItemIndex,
          spineItemIndexesLoadingBefore: [4, 5],
        })

      await expectEveryFrameToShowStartOfSpineItemWhile(
        page,
        spineItemIndex,
        letSpineItemsAboveFinishLoading,
      )
    })
  })

  test.describe("When the user scrolls, and the two above finish loading before that scroll is over", () => {
    test("every frame shows the top of that spine item, then the place the user scrolled to, which becomes the navigation", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 300, height: 400 })
      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

      const spineItemIndex = 6
      const distanceUserScrollsDown = 150
      const letSpineItemsAboveFinishLoading =
        await goToSpineItemWithOnesBeforeItStillLoading(page, {
          spineItemIndex,
          spineItemIndexesLoadingBefore: [4, 5],
        })

      await expectEveryFrameToShowWhereUserScrollsInSpineItemWhile(
        page,
        spineItemIndex,
        async () => {
          const { wasNavigationLocked } = await letSpineItemsAboveFinishLoading(
            {
              duringUserScroll: { scrollsDownFirstBy: distanceUserScrollsDown },
            },
          )

          expect(
            wasNavigationLocked,
            "whether the user's scroll was still in progress as the spine items were laid out",
          ).toBe(true)
        },
        {
          placeUserScrollsTo: { x: 0, y: distanceUserScrollsDown },
          canScrollStopOnItsWay: false,
        },
      )

      expect(
        await (await getReader(page)).evaluate((reader) => {
          const { spineItem, positionInSpineItem } =
            reader.navigation.getNavigation()

          return { spineItem, yInSpineItem: positionInSpineItem?.y }
        }),
      ).toEqual({
        spineItem: spineItemIndex,
        yInSpineItem: distanceUserScrollsDown,
      })
    })

    test("every frame shows a place of that spine item the wheel scrolls over, and the navigation names it", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "a wheel is the scroll of a mouse")

      await page.setViewportSize({ width: 300, height: 400 })
      await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

      const spineItemIndex = 6
      const distanceWheelScrollsDown = 150
      const letSpineItemsAboveFinishLoading =
        await goToSpineItemWithOnesBeforeItStillLoading(page, {
          spineItemIndex,
          spineItemIndexesLoadingBefore: [4, 5],
        })

      await page.mouse.move(150, 200)

      const placeReaderEndsOn =
        await expectEveryFrameToShowWhereUserScrollsInSpineItemWhile(
          page,
          spineItemIndex,
          async () => {
            await page.mouse.wheel(0, distanceWheelScrollsDown)

            const { wasNavigationLocked } =
              await letSpineItemsAboveFinishLoading({ duringUserScroll: {} })

            expect(
              wasNavigationLocked,
              "whether the user's scroll was still in progress as the spine items were laid out",
            ).toBe(true)
          },
          {
            placeUserScrollsTo: { x: 0, y: distanceWheelScrollsDown },
            canScrollStopOnItsWay: true,
          },
        )

      const navigation = await (await getReader(page)).evaluate((reader) => {
        const { spineItem, positionInSpineItem } =
          reader.navigation.getNavigation()

        return { spineItem, yInSpineItem: positionInSpineItem?.y }
      })

      expect(navigation.spineItem).toBe(spineItemIndex)
      // The navigation is where the scroll stopped, to less than a pixel.
      expect(navigation.yInSpineItem).toBeCloseTo(placeReaderEndsOn.y, 0)
    })
  })
})
