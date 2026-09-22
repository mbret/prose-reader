import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { resizeAndSettle, waitForReader } from "../../../utils/pagination"

/**
 * A spread shows two items at once, and its result only settles once both are
 * ready. The anchor is the begin item's first node, and a resize out of and
 * back into a spread has to come back to the same two items.
 */

const url =
  "http://localhost:3333/tests/navigation/restoration/rtl-haruko/index.html"
const landscape = { width: 723, height: 671 }
const portrait = { width: 400, height: 671 }

const readVisibleRange = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const pagination = reader.pagination.state

    if (!pagination.isSettled) throw new Error("pagination is not settled")

    const isReady = (index: number | undefined) =>
      reader.spineItemsManager.get(index)?.value.isReady ?? false

    return {
      items: [pagination.begin.spineItemIndex, pagination.end.spineItemIndex],
      ready: [
        isReady(pagination.begin.spineItemIndex),
        isReady(pagination.end.spineItemIndex),
      ],
      beginCfi: pagination.begin.cfi,
      anchor: reader.navigation.getNavigation().paginationBeginCfi,
    }
  })

test.describe("Given a spread reached by cfi", () => {
  test("settles with both items ready, anchors the entry, and comes back after a resize", async ({
    page,
  }) => {
    await page.setViewportSize(landscape)
    await page.goto(`${url}?cfi=${encodeURIComponent("epubcfi(/6/4!/2/4/2)")}`)
    await waitForReader(page)

    const spread = await readVisibleRange(page)

    expect(spread.items).toEqual([1, 2])
    expect(spread.ready).toEqual([true, true])
    expect(spread.anchor).toBe(spread.beginCfi)

    await resizeAndSettle(page, portrait)

    const single = await readVisibleRange(page)

    expect(single.items[0]).toBe(single.items[1])
    expect(spread.items).toContain(single.items[0])

    await resizeAndSettle(page, landscape)

    const restored = await readVisibleRange(page)

    expect(restored.items).toEqual(spread.items)
    expect(restored.ready).toEqual([true, true])
  })
})
