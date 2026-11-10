import type { Page } from "@playwright/test"
import type { ReadingPosition } from "@prose-reader/core"
import { navigateToSpineItem } from "../../../utils"
import { waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

/**
 * The settled position. Settlement drops for a moment whenever the spine lays
 * itself out again for an item loading nearby, so this waits for a settled
 * result and reads it in the same evaluation.
 */
export const readPosition = async (page: Page) => {
  const reader = await getReader(page)
  const handle = await page.waitForFunction(
    (reader) => {
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
    reader,
    { timeout: 10_000 },
  )
  const position = await handle.jsonValue()

  if (!position) throw new Error("no settled pagination result")

  return position
}

/**
 * Goes to a chapter's first page, then turns pages, one settled result at a
 * time: `numberOfTurns` of 3 ends on the chapter's fourth page.
 */
export const turnPagesOfChapter = async (
  page: Page,
  chapterIndex: number,
  numberOfTurns: number,
) => {
  const reader = await getReader(page)

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSettled(page)

  for (let turn = 0; turn < numberOfTurns; turn++) {
    await reader.evaluate((reader) => {
      reader.navigation.turnRight()
    })
    await waitForSettled(page)
  }
}

/**
 * Every reading position since the reader's creation: `window.readingPositions`,
 * which this scenario's `index.tsx` fills and `window` does not declare, hence
 * the cast.
 */
export const readingPositionsSinceCreation = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { readingPositions: ReadingPosition[] })
        .readingPositions,
  )
