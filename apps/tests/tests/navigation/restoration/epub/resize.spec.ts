import { expect, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSettled } from "../../../utils/pagination"
import {
  initialSize,
  narrowSize,
  readPosition,
  resizeAndExpectAnchorVisible,
  turnToThirdPageOfLongChapter,
  url,
} from "./readingPosition"

test.describe("Given a page reached by turning pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("the settled result is the reading position, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    expect(position.readingPosition).toBe(position.cfi)
    expect(position.readingPositionStatus).toBe("success")

    /**
     * Two pages into the chapter, the reading position is past the chapter's
     * start by the share of its weight those pages hold.
     */
    expect(position.readingProgression).toBeGreaterThan(position.chapterStart)
    expect(position.readingProgression).toBeCloseTo(
      position.beginPageProgression,
      10,
    )

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("navigating to the same page again anchors the new navigation, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    // A navigation to the position already shown is a new one. It starts
    // without an anchor, and restoration only reads the current navigation's
    // anchor, so it needs one of its own even though nothing moved.
    await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.navigate({
        target: {
          type: "position",
          value: reader.navigation.getNavigation().position,
        },
      })
    })
    await waitForSettled(page)

    const renavigated = await readPosition(page)

    expect(renavigated.cfi).toBe(position.cfi)
    expect(renavigated.readingPosition).toBe(position.cfi)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("repeated resizes keep the page, and the original size shows the original page again", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    /**
     * The anchor is the page the user turned to. Each restoration lands on the
     * page that now holds it, but must not move the anchor to that page's own
     * first character: at the next resize that would restore to the page
     * before, and every round trip would walk the reader backwards.
     */
    for (const size of [
      narrowSize,
      initialSize,
      { width: 500, height: 900 },
      initialSize,
    ]) {
      await resizeAndExpectAnchorVisible(page, size, position.cfi)
    }

    const restored = await readPosition(page)

    expect(restored.pageIndex).toBe(position.pageIndex)
    expect(restored.cfi).toBe(position.cfi)
    expect(restored.readingPosition).toBe(position.cfi)
    expect(restored.readingProgression).toBe(position.readingProgression)
  })
})
