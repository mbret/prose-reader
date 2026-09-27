import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSettled } from "../../../utils/pagination"
import {
  getLongChapterIndex,
  initialSize,
  narrowSize,
  navigateAndReadAtOnce,
  readPosition,
  recordReadingPositions,
  resizeAndExpectAnchorVisible,
  url,
} from "./readingPosition"

test.describe("Given a page reached by turning pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("a page turn is the reading position from the moment it happens", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      turn: "right",
      into: chapterIndex,
    })
    await waitForSettled(page)

    const turned = await readPosition(page)

    /**
     * The chapter is laid out, so the page the turn goes to is known when the
     * turn happens: the reading position is its first character straight
     * away, the one pagination settles on afterwards, and nothing else.
     */
    expect(atOnce.wasReady).toBe(true)
    expect(turned.pageIndex).toBe(1)
    expect(atOnce.isRootCfi).toBe(false)
    expect(atOnce.cfi).toBe(turned.cfi)
    expect(atOnce.status).toBe("success")
    expect(await readRecorded()).toEqual([
      {
        cfi: turned.cfi,
        isRootCfi: false,
        itemIndex: chapterIndex,
        status: "success",
      },
    ])
  })
})

/**
 * Drags the page a fifth of the window towards the next one and lets go, with
 * the pan navigator, as a finger does. That is past the snap threshold, so the
 * page turns once let go, and short of half the page, so while held the page
 * before is the one that shows the most.
 */
const dragTowardsTheNextPage = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const { panNavigator } = reader.navigation
    // A finger moving left pulls the next page in.
    const delta = { x: -window.innerWidth / 5, y: 0 }

    panNavigator.start({ x: 0, y: 0 })
    panNavigator.panMoveTo(delta)
    panNavigator.stop(delta)
  })

test.describe("Given a page reached by dragging", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("the reading position is the page the drag lands on, not the one it was held on, and a resize restores to it", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex)
    await waitForSettled(page)

    const start = await readPosition(page)

    expect(start.spineItemIndex).toBe(chapterIndex)
    expect(start.pageIndex).toBe(0)
    expect(start.numberOfPages).toBeGreaterThan(1)

    await dragTowardsTheNextPage(page)
    await expect
      .poll(() => readPosition(page).then(({ pageIndex }) => pageIndex))
      .toBe(1)

    const landed = await readPosition(page)

    expect(landed.spineItemIndex).toBe(chapterIndex)
    expect(landed.isRootCfi).toBe(false)
    expect(landed.readingPosition).toBe(landed.cfi)
    expect(landed.readingPositionStatus).toBe("success")

    /**
     * A resize restores to the reading position: the page before, were it
     * still the one the drag was held on.
     */
    await resizeAndExpectAnchorVisible(page, narrowSize, landed.cfi)
  })
})

test.describe("Given chapters that are not preloaded", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    // Only visible chapters load, so the one before is never loaded yet.
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)
  })

  test("a turn back into a previous chapter is its start at once, and its last page once it loads", async ({
    page,
  }) => {
    const previousIndex = await getLongChapterIndex(page)

    await page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, previousIndex + 1)
    await waitForSettled(page)

    const readRecorded = await recordReadingPositions(page)
    const atOnce = await navigateAndReadAtOnce(page, {
      turn: "left",
      into: previousIndex,
    })
    await waitForSettled(page)

    const settled = await readPosition(page)

    /**
     * Turning back lands on the previous chapter's last page. Until that
     * chapter is loaded no text of it can be named, so the reading position
     * is its start; once it has loaded, it is the last page's first
     * character.
     */
    expect(atOnce.wasReady).toBe(false)
    expect(atOnce.isRootCfi).toBe(true)
    expect(atOnce.status).toBe("pending")
    expect(atOnce.itemIndex).toBe(previousIndex)
    expect(atOnce.percentageEstimateOfBook).toBeCloseTo(
      settled.chapterStart,
      10,
    )
    expect(settled.spineItemIndex).toBe(previousIndex)
    expect(settled.numberOfPages).toBeGreaterThan(1)
    expect(settled.pageIndex).toBe(settled.numberOfPages - 1)
    expect(settled.isRootCfi).toBe(false)
    expect(settled.readingPosition).toBe(settled.cfi)
    // The last page starts past the chapter's start, and short of its end.
    expect(settled.readingProgression).toBeCloseTo(
      settled.beginPageProgression,
      10,
    )
    expect(settled.readingProgression).toBeGreaterThan(settled.chapterStart)
    expect(await readRecorded()).toEqual([
      {
        cfi: atOnce.cfi,
        isRootCfi: true,
        itemIndex: previousIndex,
        status: "pending",
      },
      {
        cfi: settled.cfi,
        isRootCfi: false,
        itemIndex: previousIndex,
        status: "success",
      },
    ])
  })
})
