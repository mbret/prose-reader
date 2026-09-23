import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  isCfiPositionVisible,
  navigateAndSettle,
  resizeAndSettle,
  waitForReader,
} from "../../../utils/pagination"

/**
 * Restoring a page after a resize needs a cfi, and the navigation entry can
 * carry two: `cfi`, the target a `goToCfi` asked for, and
 * `paginationBeginCfi`, the anchor pagination writes onto the entry once its
 * result settles. A page reached by turning pages asked for a position only,
 * so the anchor is the one it has. These tests exercise that path.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * The settled position. Settlement drops for a moment whenever the spine lays
 * itself out again for an item loading nearby, so this waits for a settled
 * result and reads it in the same evaluation.
 */
const readPosition = async (page: Page) => {
  const handle = await page.waitForFunction(
    () => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const pagination = reader.pagination.state

      if (!pagination.isSettled) return undefined

      const { begin } = pagination
      const navigation = reader.navigation.getNavigation()

      return {
        cfi: begin.positions.cfi,
        isRootCfi: reader.cfi.isRootCfi(begin.positions.cfi),
        pageIndex: begin.pageIndexInSpineItem,
        spineItemIndex: begin.spineItemIndex,
        navigationCfi: navigation.cfi,
        anchor: navigation.paginationBeginCfi,
      }
    },
    undefined,
    { timeout: 10_000 },
  )
  const position = await handle.jsonValue()

  if (!position) throw new Error("no settled pagination result")

  return position
}

/** Third page of a long chapter, reached by turning pages. */
const turnToThirdPageOfLongChapter = async (page: Page) => {
  const chapterIndex = await page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    return reader.context.manifest.spineItems.findIndex((item) =>
      item.href.endsWith("ch02.xhtml"),
    )
  })

  expect(chapterIndex).toBeGreaterThan(0)

  await navigateAndSettle(page, () =>
    page.evaluate((indexOrId) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.goToSpineItem({ indexOrId })
    }, chapterIndex),
  )

  for (let turn = 0; turn < 2; turn++) {
    await navigateAndSettle(page, () =>
      page.evaluate(() => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.turnRight()
      }),
    )
  }

  const position = await readPosition(page)

  expect(position.spineItemIndex).toBe(chapterIndex)
  expect(position.pageIndex).toBe(2)
  expect(position.isRootCfi).toBe(false)
  // Restoration reads `cfi` before the anchor. It must be absent here, or the
  // resize below could restore through it and prove nothing about the anchor.
  expect(position.navigationCfi).toBeUndefined()

  return position
}

const initialSize = { width: 690, height: 1294 }
// Fewer, narrower pages: the same character lands on another page index, so
// restoring by page or by offset within the item would miss it.
const narrowSize = { width: 375, height: 667 }

const resizeAndExpectAnchorVisible = async (
  page: Page,
  size: { width: number; height: number },
  cfi: string,
) => {
  await resizeAndSettle(page, size)

  // Restoration is a navigation of its own, so give it a moment to land.
  await expect
    .poll(() => isCfiPositionVisible(page, cfi), { timeout: 10_000 })
    .toBe(true)
}

test.describe("Given a page reached by turning pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForReader(page)
  })

  test("the settled result anchors the navigation, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    expect(position.anchor).toBe(position.cfi)

    await resizeAndExpectAnchorVisible(page, narrowSize, position.cfi)
  })

  test("navigating to the same page again re-anchors it, and a resize restores to it", async ({
    page,
  }) => {
    const position = await turnToThirdPageOfLongChapter(page)

    // A navigation to the position already shown is a fresh entry. It starts
    // without an anchor, and restoration reads the anchor off the current
    // entry, so it needs one of its own even though nothing moved.
    await navigateAndSettle(page, () =>
      page.evaluate(() => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.navigate({
          position: reader.navigation.getNavigation().position,
        })
      }),
    )

    const renavigated = await readPosition(page)

    expect(renavigated.cfi).toBe(position.cfi)
    expect(renavigated.anchor).toBe(position.cfi)

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
  })
})
