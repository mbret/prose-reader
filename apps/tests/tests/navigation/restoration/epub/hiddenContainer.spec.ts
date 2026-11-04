import { expect, type Page, test } from "@playwright/test"
import type { ReadingPosition } from "@prose-reader/core"
import {
  waitForSettled,
  waitForSettledOnCurrentLayout,
} from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/** The second chapter, long enough to have pages after its first. */
const chapterSpineItemIndex = 11

/** What the page records from the moment it hides the reader's container. */
type RecordedSinceHiding = {
  viewportSizesLaidOut: { width: number; height: number }[]
  settledPages: string[]
}

/**
 * The page's window, as the scenario's `index.tsx` and the page functions
 * below fill it. The page functions cast to it, since the window's own type
 * knows none of it.
 */
type ScenarioWindow = {
  readingPositions: ReadingPosition[]
  recordedSinceHiding: RecordedSinceHiding
}

const collectPageErrors = (page: Page) => {
  const pageErrors: Error[] = []

  page.on("pageerror", (error) => {
    pageErrors.push(error)
  })

  return pageErrors
}

const openChapter = async (page: Page) => {
  await page.setViewportSize({ width: 536, height: 842 })
  await page.goto(
    `${url}?cfi=${encodeURIComponent(`epubcfi(/6/${(chapterSpineItemIndex + 1) * 2}!)`)}`,
  )
  await waitForSettledOnCurrentLayout(page)

  return getReader(page)
}

/**
 * Hidden under `display: none`, as in a tab or an `<Activity>`, the container
 * and everything in it measure 0 by 0, which is no size to lay a book out at.
 */
test.describe("Given a reader on a page after the first of its chapter", () => {
  test.describe("when its container is hidden, then shown", () => {
    test("should keep that page, and lay out only at a size", async ({
      page,
    }) => {
      const pageErrors = collectPageErrors(page)
      const reader = await openChapter(page)

      await reader.evaluate((reader) => {
        reader.navigation.turnRight()
      })
      await waitForSettled(page)

      const beforeHiding = await reader.evaluate(({ pagination }) => {
        const { readingPositions } = window as unknown as ScenarioWindow

        return {
          cfi: pagination.state.begin.cfi,
          spineItemIndex: pagination.state.begin.spineItemIndex,
          pageIndexInSpineItem: pagination.state.begin.pageIndexInSpineItem,
          readingPosition: readingPositions[readingPositions.length - 1],
        }
      })

      expect(beforeHiding.spineItemIndex).toBe(chapterSpineItemIndex)
      expect(beforeHiding.pageIndexInSpineItem).toBeGreaterThan(0)

      /**
       * The container stays hidden until the browser reports it at 0 by 0,
       * about one rendered frame. That is shorter than the 100 ms the reader's
       * container observer waits, so this spec does not see what the observer
       * does with a container of no size: core's `layoutTriggers.test.ts`
       * proves it.
       */
      const viewportSizesLaidOutOnRequest = await reader.evaluate(
        async (reader) => {
          const container = document.getElementById("app")

          if (!container) throw new Error("the page has no #app container")

          const recorded: RecordedSinceHiding = {
            viewportSizesLaidOut: [],
            settledPages: [],
          }

          Object.assign(window, { recordedSinceHiding: recorded })

          reader.viewport.layout$.subscribe(() => {
            const { width, height } = reader.viewport.absoluteViewport

            recorded.viewportSizesLaidOut.push({ width, height })
          })
          reader.pagination.state$.subscribe(({ isSettled, begin }) => {
            if (!isSettled) return

            recorded.settledPages.push(
              `${begin.spineItemIndex}:${begin.pageIndexInSpineItem}`,
            )
          })

          container.style.display = "none"
          // Stands in for anything that asks for a layout while hidden: a
          // setting changed, a chapter done loading.
          reader.layout()

          const viewportSizesLaidOutOnRequest = [
            ...recorded.viewportSizesLaidOut,
          ]

          await new Promise<void>((resolve) => {
            const observer = new ResizeObserver(([entry]) => {
              if (entry?.contentRect.width !== 0) return

              observer.disconnect()
              resolve()
            })

            observer.observe(container)
          })

          return viewportSizesLaidOutOnRequest
        },
      )

      expect(viewportSizesLaidOutOnRequest).toEqual([])

      await reader.evaluate(() => {
        document.getElementById("app")?.style.removeProperty("display")
      })
      // The layout requested while hidden runs once the container has a size.
      await waitForSettledOnCurrentLayout(page)

      const afterShowing = await reader.evaluate(({ pagination }) => {
        const { recordedSinceHiding, readingPositions } =
          window as unknown as ScenarioWindow

        return {
          cfi: pagination.state.begin.cfi,
          readingPosition: readingPositions[readingPositions.length - 1],
          ...recordedSinceHiding,
        }
      })

      expect(afterShowing.viewportSizesLaidOut).toEqual([page.viewportSize()])
      expect(new Set(afterShowing.settledPages)).toEqual(
        new Set([
          `${beforeHiding.spineItemIndex}:${beforeHiding.pageIndexInSpineItem}`,
        ]),
      )
      expect(afterShowing.cfi).toBe(beforeHiding.cfi)
      expect(afterShowing.readingPosition?.cfi).toBe(
        beforeHiding.readingPosition?.cfi,
      )
      expect(pageErrors).toEqual([])
    })
  })
})
