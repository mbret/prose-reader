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
  isPointerOverFrame: boolean
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

test.describe("Given the pointer over a chapter's frame", () => {
  test.describe("when the reader's container is hidden", () => {
    test("should forward the pointer leaving the frame to the reader, at its position in the frame", async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== "chromium",
        "Firefox and WebKit send a frame they hide no pointer event, so there is nothing to forward",
      )

      const pageErrors = collectPageErrors(page)
      const reader = await openChapter(page)

      await reader.evaluate((reader, spineItemIndex) => {
        const frameDocument = reader.spineItemsManager
          .get(spineItemIndex)
          ?.renderer.getDocumentFrame()?.contentDocument

        if (!frameDocument) throw new Error("the chapter has no document")

        Object.assign(window, { isPointerOverFrame: false })
        frameDocument.addEventListener(
          "pointerover",
          () => {
            Object.assign(window, { isPointerOverFrame: true })
          },
          { once: true },
        )
      }, chapterSpineItemIndex)

      const viewportSize = page.viewportSize()

      if (!viewportSize) throw new Error("the page has no viewport size")

      // Chromium can deliver a first move to the page rather than to the
      // frame under it, so the pointer moves until the frame reports it.
      let pointerMoves = 0

      await expect
        .poll(async () => {
          pointerMoves += 1
          await page.mouse.move(
            viewportSize.width / 2,
            viewportSize.height / 2 + pointerMoves,
          )

          return page.evaluate(
            () => (window as unknown as ScenarioWindow).isPointerOverFrame,
          )
        })
        .toBe(true)

      const leaves = await reader.evaluate(async (reader, spineItemIndex) => {
        const container = document.getElementById("app")
        const { rootElement } = reader.context.value
        const frameDocument = reader.spineItemsManager
          .get(spineItemIndex)
          ?.renderer.getDocumentFrame()?.contentDocument

        if (!container || !rootElement || !frameDocument) {
          throw new Error("the reader is not mounted on the chapter")
        }

        const forwardedLeaves: { clientX: number; clientY: number }[] = []

        rootElement.addEventListener("pointerleave", ({ clientX, clientY }) => {
          forwardedLeaves.push({ clientX, clientY })
        })

        /**
         * The reader listens to the frame's document from the moment it
         * loads, so this listener runs after the reader has forwarded the
         * event, or thrown. Chromium sends `pointerleave` in a rendering
         * update after the hide, so the page asks for animation frames until
         * it arrives.
         */
        const frameLeave = new Promise<{ clientX: number; clientY: number }>(
          (resolve) => {
            let hasPointerLeftFrame = false

            frameDocument.addEventListener(
              "pointerleave",
              ({ clientX, clientY }) => {
                hasPointerLeftFrame = true
                resolve({ clientX, clientY })
              },
              { once: true },
            )

            const renderNextFrame = () => {
              if (!hasPointerLeftFrame) requestAnimationFrame(renderNextFrame)
            }

            requestAnimationFrame(renderNextFrame)
          },
        )

        container.style.display = "none"

        return { frameLeave: await frameLeave, forwardedLeaves }
      }, chapterSpineItemIndex)

      expect(pageErrors).toEqual([])
      // The hidden frame has no size to scale the position by.
      expect(leaves.forwardedLeaves).toEqual([leaves.frameLeave])
    })
  })
})
