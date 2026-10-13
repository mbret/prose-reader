import { expect, test } from "@playwright/test"
import type { Reader, ReadingPosition } from "@prose-reader/core"
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

  test("the reading position saved at another size reopens the book on the same page", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)

    /**
     * At the narrower size the page holding the anchor starts earlier, so the
     * visible range moved while the reader did not. Saving the visible range
     * would reopen the book on the page before at the original size, one page
     * further back at every save; the reading position stays put.
     */
    const narrow = await readPosition(page)

    expect(narrow.cfi).not.toBe(position.cfi)
    expect(narrow.readingPosition).toBe(position.cfi)
    expect(narrow.readingProgression).toBe(position.readingProgression)

    await page.setViewportSize(initialSize)
    await page.goto(`${url}?cfi=${encodeURIComponent(position.cfi)}`)
    await waitForSettled(page)

    const reopened = await readPosition(page)

    expect(reopened.spineItemIndex).toBe(position.spineItemIndex)
    expect(reopened.pageIndex).toBe(position.pageIndex)
    expect(reopened.readingPosition).toBe(position.cfi)
    // Found in its chapter's document, where the page holding it is measured.
    expect(reopened.readingPositionStatus).toBe("success")
    expect(reopened.readingProgression).toBeCloseTo(
      position.readingProgression ?? Number.NaN,
      10,
    )
  })

  test("a book reopened at the reading position reports its chapter's start on the way, never the book's, and ends a success on it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    await page.goto(`${url}?cfi=${encodeURIComponent(position.cfi)}`)
    await waitForSettled(page)
    await expect
      .poll(() => readPosition(page).then((read) => read.readingPositionStatus))
      .toBe("success")

    // Every value an app saving the reading position would have saved.
    const saved = await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      // @ts-expect-error window.readingPositions is set by this scenario's index.tsx
      const values = window.readingPositions as ReadingPosition[]

      return values.map((value) => ({
        ...value,
        isRootCfi: reader.cfi.isRootCfi(value.cfi),
        itemIndex: reader.cfi.parseCfi(value.cfi).itemIndex,
      }))
    })

    /**
     * Until the chapter is loaded, the reader does not know where the cfi
     * takes it: the reading position stands in at the chapter's start, as for
     * any navigation into a chapter not loaded. Then it is the cfi, the place
     * the target names, pending until the page holding it is laid out and a
     * success after. None is
     * the start of the book.
     */
    const last = saved[saved.length - 1]

    expect(last).toMatchObject({ cfi: position.cfi, status: "success" })
    expect(last?.percentageEstimateOfBook).toBeCloseTo(
      position.readingProgression ?? Number.NaN,
      10,
    )
    const chapterStart = "the chapter's start"
    const onTheWay = [
      {
        status: "pending",
        itemIndex: position.spineItemIndex,
        cfi: chapterStart,
      },
      {
        status: "pending",
        itemIndex: position.spineItemIndex,
        cfi: position.cfi,
      },
    ]

    for (const { status, itemIndex, cfi, isRootCfi } of saved.slice(0, -1)) {
      expect(onTheWay).toContainEqual({
        status,
        itemIndex,
        cfi: isRootCfi ? chapterStart : cfi,
      })
    }
    for (const { percentageEstimateOfBook } of saved) {
      expect(percentageEstimateOfBook).toBeGreaterThanOrEqual(
        position.chapterStart,
      )
    }
  })
})
