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
 * Records every reading position from now on, leaving out the current one
 * that subscribing replays. Returns a reader of what was recorded so far.
 */
export const recordReadingPositions = async (page: Page) => {
  await page.evaluate(() => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const recorded: Pick<ReadingPosition, "cfi" | "status">[] = []
    let replaying = true

    reader.navigation.readingPosition$.subscribe(({ cfi, status }) => {
      if (!replaying) recorded.push({ cfi, status })
    })
    replaying = false

    // @ts-expect-error scratch slot for this spec
    window.__readingPositions = recorded
  })

  return () =>
    page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      // @ts-expect-error scratch slot for this spec
      const recorded = window.__readingPositions as Pick<
        ReadingPosition,
        "cfi" | "status"
      >[]

      return recorded.map(({ cfi, status }) => ({
        cfi,
        isRootCfi: reader.cfi.isRootCfi(cfi),
        itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
        status,
      }))
    })
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

/**
 * Runs a navigation and reads the reading position in the same task, before
 * anything asynchronous has happened, along with whether its item was ready
 * when the navigation started.
 */
export const navigateAndReadAtOnce = (
  page: Page,
  navigation:
    | { turn: "left" | "right"; into: number }
    | { cfi: string; into: number }
    | { spineItem: number },
) =>
  page.evaluate((navigation) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const target =
      "spineItem" in navigation ? navigation.spineItem : navigation.into
    const wasReady =
      reader.spineItemsManager.get(target)?.value.isReady ?? false

    if ("spineItem" in navigation) {
      reader.navigation.goToSpineItem({ indexOrId: navigation.spineItem })
    } else if ("cfi" in navigation) {
      reader.navigation.goToCfi(navigation.cfi)
    } else if (navigation.turn === "left") {
      reader.navigation.turnLeft()
    } else {
      reader.navigation.turnRight()
    }

    let readingPosition: ReadingPosition | undefined
    reader.navigation.readingPosition$
      .subscribe((value) => {
        readingPosition = value
      })
      .unsubscribe()

    if (readingPosition === undefined) throw new Error("no reading position")

    const { cfi, percentageEstimateOfBook, status } = readingPosition

    return {
      cfi,
      percentageEstimateOfBook,
      status,
      isRootCfi: reader.cfi.isRootCfi(cfi),
      itemIndex: reader.cfi.parseCfi(cfi).itemIndex,
      wasReady,
    }
  }, navigation)

/** Third page of a long chapter, reached by turning pages. */
export const turnToThirdPageOfLongChapter = async (page: Page) => {
  const chapterIndex = await getLongChapterIndex(page)

  await page.evaluate((indexOrId) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader

    reader.navigation.goToSpineItem({ indexOrId })
  }, chapterIndex)
  await waitForSettled(page)

  for (let turn = 0; turn < 2; turn++) {
    await page.evaluate(() => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader

      reader.navigation.turnRight()
    })
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
