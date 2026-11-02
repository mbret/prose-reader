import { expect, type Page, test } from "@playwright/test"
import type { UnboundSpinePosition } from "@prose-reader/core"
import {
  navigateTo,
  navigateToSpineItem,
  waitForSpineItemReady,
  zoomAt,
} from "../../utils"
import { getReader } from "../../utils/reader"
import {
  expectLoadedSpineItemsToBeTheOnesOnScreen,
  getSpineItemIndexesOnScreen,
  recordSpineItemsUnloadedOnScreen,
} from "../../utils/visibility"

/**
 * The reader preloads no chapter here, so it loads the chapters on screen and
 * no other. Zoomed, the screen shows more of the book than the navigation does,
 * or less: these hold the reader to what the zoomed page shows, through every
 * load and layout that follows, and check it never blanks a chapter on screen
 * on the way.
 *
 * A chapter is as tall as the screen until it first loads, then grows to the
 * height of its picture, pushing the ones after it down.
 */
const url = "http://localhost:3333/tests/zoom/webtoon/index.html?preload=0"

const openAtTheStart = async (page: Page) => {
  await page.setViewportSize({ width: 300, height: 400 })
  await page.goto(url)
  await waitForSpineItemReady(page, [0])
  await expectLoadedSpineItemsToBeTheOnesOnScreen(page)
}

test.describe("Given the start of the book", () => {
  test("zoomed out, it loads the chapters on screen, and only them", async ({
    page,
  }) => {
    await openAtTheStart(page)

    expect(await getSpineItemIndexesOnScreen(page)).toEqual([0])

    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    await zoomAt({ page, scale: 0.2 })

    // The book can't scroll above its start, so the zoomed out screen shows
    // the chapters after the first one. The second pushes the third off it
    // once it loads and grows, and the reader measures again then.
    expect(await getSpineItemIndexesOnScreen(page)).toEqual([0, 1, 2])

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })
})

test.describe("Given a chapter in the middle of the book", () => {
  test("zoomed out, it loads the chapters on screen, and only them", async ({
    page,
  }) => {
    await openAtTheStart(page)
    await navigateToSpineItem({ page, index: 5 })
    await waitForSpineItemReady(page, [5])
    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemIndexesOnScreen(page)).toEqual([5])

    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    await zoomAt({ page, scale: 0.25 })

    // The zoomed out screen shows the chapters before the fifth too.
    const spineItemIndexesOnScreen = await getSpineItemIndexesOnScreen(page)

    expect(spineItemIndexesOnScreen).toContain(4)
    expect(spineItemIndexesOnScreen).toContain(5)

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })
})

test.describe("Given a zoomed in screen", () => {
  test("going to the end of a chapter keeps that chapter loaded", async ({
    page,
  }) => {
    await openAtTheStart(page)

    // The second chapter loads, and takes its height, before the screen goes
    // to its end.
    await navigateToSpineItem({ page, index: 1 })
    await waitForSpineItemReady(page, [1])
    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)
    await zoomAt({ page, scale: 2 })
    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemIndexesOnScreen(page)).toEqual([1])

    const reader = await getReader(page)
    const thirdChapterTop = await reader.evaluate(
      (reader) => reader.spine.getSpineItemSpineLayoutInfo(2).top,
    )
    const getSpineItemsUnloadedOnScreen =
      await recordSpineItemsUnloadedOnScreen(page)

    // Zoomed in to twice the size, the screen shows 200px of the book: the
    // second chapter's last 50px at its top, then the third chapter, which
    // the reader has yet to load.
    await navigateTo({
      page,
      navigation: {
        target: {
          type: "position",
          // The navigation reaches the page as JSON, where any position is a
          // plain `{ x, y }`.
          value: { x: 0, y: thirdChapterTop - 50 } as UnboundSpinePosition,
        },
      },
    })

    await expect.poll(() => getSpineItemIndexesOnScreen(page)).toEqual([1, 2])

    await expectLoadedSpineItemsToBeTheOnesOnScreen(page)

    expect(await getSpineItemsUnloadedOnScreen()).toEqual([])
  })
})
