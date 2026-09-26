import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { resizeAndSettle, waitForSettled } from "../../../utils/pagination"

/**
 * A spread shows two items at once, and its result only settles once both are
 * ready. A navigation to a cfi keeps that cfi as its reading position, and a
 * resize out of and back into a spread has to come back to the same two items.
 */

const url =
  "http://localhost:3333/tests/navigation/restoration/rtl-haruko/index.html"
const landscape = { width: 723, height: 671 }
const portrait = { width: 400, height: 671 }

/**
 * The settled visible range. Settlement drops for a moment whenever the spine
 * lays itself out again for an item loading nearby, so this waits for a
 * settled result and reads it in the same evaluation.
 */
const readVisibleRange = async (page: Page) => {
  const handle = await page.waitForFunction(
    () => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const pagination = reader.pagination.state

      if (!pagination.isSettled) return undefined

      const isReady = (index: number | undefined) =>
        reader.spineItemsManager.get(index)?.value.isReady ?? false
      let readingPosition:
        | { cfi: string; percentageEstimateOfBook: number }
        | undefined
      // Replays the current one, synchronously.
      reader.navigation.readingPosition$
        .subscribe((value) => {
          readingPosition = value
        })
        .unsubscribe()

      // Where each item starts in the book. Every item of this book has a
      // weight, so they only need scaling to their total.
      const weights = reader.context.manifest.spineItems.map(
        ({ progressionWeight }) => progressionWeight ?? Number.NaN,
      )
      const totalWeight = weights.reduce((total, weight) => total + weight, 0)
      const itemStarts = weights.map(
        (_, index) =>
          weights.slice(0, index).reduce((total, weight) => total + weight, 0) /
          totalWeight,
      )

      return {
        items: [pagination.begin.spineItemIndex, pagination.end.spineItemIndex],
        ready: [
          isReady(pagination.begin.spineItemIndex),
          isReady(pagination.end.spineItemIndex),
        ],
        beginCfi: pagination.begin.cfi,
        readingPosition: readingPosition?.cfi,
        readingProgression: readingPosition?.percentageEstimateOfBook,
        itemStarts,
      }
    },
    undefined,
    { timeout: 10_000 },
  )
  const range = await handle.jsonValue()

  if (!range) throw new Error("no settled pagination result")

  return range
}

test.describe("Given a spread reached by cfi", () => {
  test("settles with both items ready, keeps the cfi as the reading position, and comes back after a resize", async ({
    page,
  }) => {
    // The image of item 1's page. A cfi naming nothing there would not be kept
    // as the reading position once the item loads.
    const cfi = "epubcfi(/6/4!/4/2)"

    await page.setViewportSize(landscape)
    await page.goto(`${url}?cfi=${encodeURIComponent(cfi)}`)
    await waitForSettled(page)

    const spread = await readVisibleRange(page)

    expect(spread.items).toEqual([1, 2])
    expect(spread.ready).toEqual([true, true])
    expect(spread.readingPosition).toBe(cfi)

    await resizeAndSettle(page, portrait)

    const single = await readVisibleRange(page)

    expect(single.items[0]).toBe(single.items[1])
    expect(spread.items).toContain(single.items[0])

    await resizeAndSettle(page, landscape)

    const restored = await readVisibleRange(page)

    expect(restored.items).toEqual(spread.items)
    expect(restored.ready).toEqual([true, true])
    expect(restored.readingPosition).toBe(cfi)
  })
})

test.describe("Given a cfi on the second page of a spread", () => {
  test("keeps how far into the book that page is, not the spread's first", async ({
    page,
  }) => {
    // The image of item 2's page.
    const cfi = "epubcfi(/6/6!/4/2)"

    await page.setViewportSize(landscape)
    await page.goto(`${url}?cfi=${encodeURIComponent(cfi)}`)
    await waitForSettled(page)

    const spread = await readVisibleRange(page)

    /**
     * The spread holding item 2 starts at item 1, so the position the reader
     * goes to is item 1's page. The cfi is on item 2's.
     */
    expect(spread.items).toEqual([1, 2])
    expect(spread.readingPosition).toBe(cfi)
    expect(spread.itemStarts[2]).toBeGreaterThan(spread.itemStarts[1] ?? 1)
    expect(spread.readingProgression).toBeCloseTo(
      spread.itemStarts[2] ?? Number.NaN,
      10,
    )
  })
})
