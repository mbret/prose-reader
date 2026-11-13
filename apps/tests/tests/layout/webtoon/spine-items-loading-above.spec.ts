import { expect, type Page } from "@playwright/test"
import { getReader } from "../../utils/reader"
import {
  expectEveryFrameToShowStartOfSpineItemWhile,
  expectEveryFrameToShowWhereUserScrollsInSpineItemWhile,
  goToSpineItemWithOnesBeforeItStillLoading,
} from "../../utils/spineItems"
import { test } from "../../utils/test"

/**
 * A spine item of this book is one screen tall until its image loads, and
 * more than three after: the two that load above this one move it down.
 */
const spineItemIndex = 6

const openAtTopOfSpineItemWithTwoAboveStillLoading = async (page: Page) => {
  await page.setViewportSize({ width: 300, height: 400 })
  await page.goto("http://localhost:3333/tests/layout/webtoon/index.html")

  return goToSpineItemWithOnesBeforeItStillLoading(page, {
    spineItemIndex,
    spineItemIndexesLoadingBefore: [4, 5],
  })
}

const getSpineItemAndPlaceInItOfNavigation = async (page: Page) =>
  (await getReader(page)).evaluate((reader) => {
    const { spineItem, positionInSpineItem } = reader.navigation.getNavigation()

    return { spineItem, yInSpineItem: positionInSpineItem?.y }
  })

/**
 * The user scrolls down, and the two spine items above finish loading before
 * that scroll is over. Expects every frame to show the top of the spine item,
 * then the place the user scrolled to, and the navigation to name that place.
 *
 * With `laysOutReaderOnceLoadsFinish`, a layout of the reader follows the
 * loads at once. `isUserScrollingAsSpineItemsAreLaidOut` says whether the
 * reader then lays the spine items out before the scroll is over.
 */
const expectEveryFrameToShowWhereUserScrollsWhileSpineItemsAboveFinishLoading =
  async (
    page: Page,
    {
      laysOutReaderOnceLoadsFinish,
      isUserScrollingAsSpineItemsAreLaidOut,
    }: {
      laysOutReaderOnceLoadsFinish: boolean
      isUserScrollingAsSpineItemsAreLaidOut: boolean
    },
  ) => {
    const distanceUserScrollsDown = 150
    const letSpineItemsAboveFinishLoading =
      await openAtTopOfSpineItemWithTwoAboveStillLoading(page)

    await expectEveryFrameToShowWhereUserScrollsInSpineItemWhile(
      page,
      spineItemIndex,
      async () => {
        const {
          wasNavigationLockedAsLoadsFinished,
          wasNavigationLockedAsSpineItemsWereLaidOut,
        } = await letSpineItemsAboveFinishLoading({
          duringUserScroll: {
            scrollsDownFirstBy: distanceUserScrollsDown,
            laysOutReaderOnceLoadsFinish,
          },
        })

        expect(
          wasNavigationLockedAsLoadsFinished,
          "whether the user's scroll was still in progress as the spine items finished loading",
        ).toBe(true)
        expect(
          wasNavigationLockedAsSpineItemsWereLaidOut,
          "whether the user's scroll was still in progress as the spine items were laid out",
        ).toBe(isUserScrollingAsSpineItemsAreLaidOut)
      },
      {
        placeUserScrollsTo: { x: 0, y: distanceUserScrollsDown },
        canScrollStopOnItsWay: false,
      },
    )

    expect(await getSpineItemAndPlaceInItOfNavigation(page)).toEqual({
      spineItem: spineItemIndex,
      yInSpineItem: distanceUserScrollsDown,
    })
  }

test.describe("Given a book that scrolls, at the top of a spine item with the two above it still loading", () => {
  test.describe("When the two above finish loading", () => {
    test("every frame shows the top of that spine item", async ({ page }) => {
      const letSpineItemsAboveFinishLoading =
        await openAtTopOfSpineItemWithTwoAboveStillLoading(page)

      await expectEveryFrameToShowStartOfSpineItemWhile(
        page,
        spineItemIndex,
        letSpineItemsAboveFinishLoading,
      )
    })
  })

  test.describe("When the user scrolls, and the two above finish loading before that scroll is over", () => {
    test("every frame shows the top of that spine item, then the place the user scrolled to, and the reader lays out for the two once the scroll is over", async ({
      page,
    }) => {
      await expectEveryFrameToShowWhereUserScrollsWhileSpineItemsAboveFinishLoading(
        page,
        {
          laysOutReaderOnceLoadsFinish: false,
          isUserScrollingAsSpineItemsAreLaidOut: false,
        },
      )
    })
  })

  test.describe("When the user scrolls, the two above finish loading, and the reader is laid out before that scroll is over", () => {
    test("every frame shows the top of that spine item, then the place the user scrolled to, which becomes the navigation", async ({
      page,
    }) => {
      await expectEveryFrameToShowWhereUserScrollsWhileSpineItemsAboveFinishLoading(
        page,
        {
          laysOutReaderOnceLoadsFinish: true,
          isUserScrollingAsSpineItemsAreLaidOut: true,
        },
      )
    })

    test("every frame shows a place of that spine item the wheel scrolls over, and the navigation names it", async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "a wheel is the scroll of a mouse")

      const distanceWheelScrollsDown = 150
      const letSpineItemsAboveFinishLoading =
        await openAtTopOfSpineItemWithTwoAboveStillLoading(page)

      await page.mouse.move(150, 200)

      const placeReaderEndsOn =
        await expectEveryFrameToShowWhereUserScrollsInSpineItemWhile(
          page,
          spineItemIndex,
          async () => {
            await page.mouse.wheel(0, distanceWheelScrollsDown)

            const {
              wasNavigationLockedAsLoadsFinished,
              wasNavigationLockedAsSpineItemsWereLaidOut,
            } = await letSpineItemsAboveFinishLoading({
              duringUserScroll: { laysOutReaderOnceLoadsFinish: true },
            })

            expect(
              wasNavigationLockedAsLoadsFinished,
              "whether the user's scroll was still in progress as the spine items finished loading",
            ).toBe(true)
            expect(
              wasNavigationLockedAsSpineItemsWereLaidOut,
              "whether the user's scroll was still in progress as the spine items were laid out",
            ).toBe(true)
          },
          {
            placeUserScrollsTo: { x: 0, y: distanceWheelScrollsDown },
            canScrollStopOnItsWay: true,
          },
        )

      const navigation = await getSpineItemAndPlaceInItOfNavigation(page)

      expect(navigation.spineItem).toBe(spineItemIndex)
      // The navigation is where the scroll stopped, to less than a pixel.
      expect(navigation.yInSpineItem).toBeCloseTo(placeReaderEndsOn.y, 0)
    })
  })
})
