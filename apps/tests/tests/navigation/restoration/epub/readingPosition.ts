import { expect, type Page } from "@playwright/test"
import type { Reader, ReadingPosition } from "@prose-reader/core"
import { resizeAndSettle, waitForSettled } from "../../../utils/pagination"
import { isCfiPositionVisible } from "../../../utils/visibility"

/**
 * Restoring a page after a resize needs a cfi. A navigation that asked for one
 * restores to it; one that did not, such as a page reached by turning pages,
 * restores to the text at the page it went to. That is the reading position,
 * the value to save and reopen the book at. The specs next to this module
 * exercise that path, and share what follows.
 */

export const url =
  "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * The settled position. Settlement drops for a moment whenever the spine lays
 * itself out again for an item loading nearby, so this waits for a settled
 * result and reads it in the same evaluation.
 */
export const readPosition = async (page: Page) => {
  const handle = await page.waitForFunction(
    () => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const pagination = reader.pagination.state

      if (!pagination.isSettled) return undefined

      const { begin } = pagination
      const navigation = reader.navigation.getNavigation()
      let readingPosition: ReadingPosition | undefined
      // Replays the current one, synchronously.
      reader.navigation.readingPosition$
        .subscribe((value) => {
          readingPosition = value
        })
        .unsubscribe()

      /**
       * Where the begin page starts in the book: its chapter's start, and the
       * share of the chapter's weight the pages before it hold. Every chapter
       * of this book has a weight, so they only need scaling to their total.
       */
      const { spineItems } = reader.context.manifest
      const totalWeight = spineItems.reduce(
        (total, { progressionWeight }) =>
          total + (progressionWeight ?? Number.NaN),
        0,
      )
      const weightOf = (index: number) =>
        (spineItems[index]?.progressionWeight ?? Number.NaN) / totalWeight
      const chapterStart = spineItems
        .slice(0, begin.spineItemIndex)
        .reduce((total, _, index) => total + weightOf(index), 0)
      const beginPageProgression =
        chapterStart +
        (weightOf(begin.spineItemIndex ?? 0) *
          (begin.pageIndexInSpineItem ?? 0)) /
          begin.numberOfPagesInSpineItem

      return {
        cfi: begin.cfi,
        isRootCfi: reader.cfi.isRootCfi(begin.cfi),
        pageIndex: begin.pageIndexInSpineItem,
        numberOfPages: begin.numberOfPagesInSpineItem,
        spineItemIndex: begin.spineItemIndex,
        chapterStart,
        beginPageProgression,
        navigationCfi:
          navigation.target.type === "cfi"
            ? navigation.target.value
            : undefined,
        readingPosition: readingPosition?.cfi,
        readingProgression: readingPosition?.percentageEstimateOfBook,
        readingPositionStatus: readingPosition?.status,
      }
    },
    undefined,
    { timeout: 10_000 },
  )
  const position = await handle.jsonValue()

  if (!position) throw new Error("no settled pagination result")

  return position
}

/**
 * The reading positions this scenario's index.tsx records from now on, in the
 * order they were emitted. A navigation that moves the reading position does
 * so before it returns, so the first one recorded after it is its reading
 * position at once. Returns a reader of what was recorded so far.
 */
export const recordReadingPositions = async (page: Page) => {
  const numberOfEarlierReadingPositions = await page.evaluate(
    () =>
      // @ts-expect-error window.readingPositions is set by this scenario's index.tsx
      (window.readingPositions as ReadingPosition[]).length,
  )

  return () =>
    page.evaluate((numberOfEarlierReadingPositions) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      // @ts-expect-error window.readingPositions is set by this scenario's index.tsx
      const readingPositions = window.readingPositions as ReadingPosition[]

      return readingPositions
        .slice(numberOfEarlierReadingPositions)
        .map(({ cfi, percentageEstimateOfBook, status }) => ({
          cfi,
          isRootCfi: reader.cfi.isRootCfi(cfi),
          itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
          percentageEstimateOfBook,
          status,
        }))
    }, numberOfEarlierReadingPositions)
}

export const getChapterIndex = async (page: Page, href: string) => {
  const chapterIndex = await page.evaluate((href) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    return reader.context.manifest.spineItems.findIndex((item) =>
      item.href.endsWith(href),
    )
  }, href)

  expect(chapterIndex).toBeGreaterThan(0)

  return chapterIndex
}

export const getLongChapterIndex = (page: Page) =>
  getChapterIndex(page, "ch02.xhtml")

export const goToSpineItem = (page: Page, indexOrId: number) =>
  page.evaluate((indexOrId) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToSpineItem({ indexOrId })
  }, indexOrId)

export const goToCfi = (page: Page, cfi: string) =>
  page.evaluate((cfi) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToCfi(cfi)
  }, cfi)

export const turnRight = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.turnRight()
  })

export const turnLeft = (page: Page) =>
  page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.turnLeft()
  })

/** Whether a chapter's document is loaded and laid out. */
export const isChapterReady = (page: Page, chapterIndex: number) =>
  page.evaluate(
    (chapterIndex) =>
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      (window.reader as Reader).spineItemsManager.get(chapterIndex)?.value
        .isReady ?? false,
    chapterIndex,
  )

/** Third page of a long chapter, reached by turning pages. */
export const turnToThirdPageOfLongChapter = async (page: Page) => {
  const chapterIndex = await getLongChapterIndex(page)

  await goToSpineItem(page, chapterIndex)
  await waitForSettled(page)

  for (let turn = 0; turn < 2; turn++) {
    await turnRight(page)
    await waitForSettled(page)
  }

  const position = await readPosition(page)

  expect(position.spineItemIndex).toBe(chapterIndex)
  expect(position.pageIndex).toBe(2)
  expect(position.isRootCfi).toBe(false)
  // Restoration reads the navigation's own `cfi` before the anchor. It must be
  // absent here, or a resize could restore through it and prove nothing about
  // the anchor.
  expect(position.navigationCfi).toBeUndefined()

  return position
}

export const initialSize = { width: 690, height: 1294 }
// Fewer, narrower pages: the same character lands on another page index, so
// restoring by page or by offset within the item would miss it.
export const narrowSize = { width: 375, height: 667 }

export const resizeAndExpectAnchorVisible = async (
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
