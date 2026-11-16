import { expect } from "@playwright/test"
import { getLongChapterIndex, navigateToSpineItem } from "../../../utils"
import {
  layOutAndSettle,
  waitForSettled,
  waitForSettledOnCurrentLayout,
} from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"
import { readPosition } from "./position"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * A navigation that the user's scroll did not make ends that scroll. Left to
 * go on, the scroll navigates to where its element is once it is over, and
 * that navigation replaces the app's and the place its target names.
 */
test.describe("Given a book that scrolls, and a scroll of the user's that is not over", () => {
  test.describe("When the app goes to a place inside a chapter that is not loaded", () => {
    test("Then the scroll is over at once, and the reading position ends where it does for the same navigation made at rest", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 536, height: 842 })
      await page.goto(url)
      await waitForSettled(page)
      await layOutAndSettle(page, {
        settings: { pageTurnMode: "scrollable" },
      })

      const reader = await getReader(page)
      const chapterIndex = await getLongChapterIndex(page)

      // The cfi of a paragraph of that chapter, after its first one.
      await navigateToSpineItem({ page, index: chapterIndex })
      await page.waitForFunction(
        ({ reader, chapterIndex }) =>
          reader.spineItemsManager.get(chapterIndex)?.value.isReady,
        { reader, chapterIndex },
      )

      const cfi = await reader.evaluate((reader, chapterIndex) => {
        const spineItem = reader.spineItemsManager.get(chapterIndex)
        const chapterDocument =
          spineItem?.renderer.getDocumentFrame()?.contentDocument
        const textOfThirdParagraph =
          chapterDocument?.querySelectorAll("p")[2]?.firstChild

        if (!spineItem || !chapterDocument || !textOfThirdParagraph) {
          throw new Error(`no third paragraph in chapter ${chapterIndex}`)
        }

        const range = chapterDocument.createRange()

        range.setStart(textOfThirdParagraph, 0)
        range.setEnd(textOfThirdParagraph, 1)

        return reader.cfi.generateCfiFromRange(range, spineItem.item)
      }, chapterIndex)

      const goToStartOfBookWithChapterReleased = async () => {
        await navigateToSpineItem({ page, index: 0 })
        await page.waitForFunction(
          ({ reader, chapterIndex }) =>
            reader.spineItemsManager.get(chapterIndex)?.value.loadStatus ===
            "idle",
          { reader, chapterIndex },
        )
        await waitForSettledOnCurrentLayout(page)
      }

      const getReadingPositionOnceFoundInChapter = async () => {
        await expect
          .poll(async () => {
            const { spineItemIndex, readingPositionStatus } =
              await readPosition(page)

            return { spineItemIndex, readingPositionStatus }
          })
          .toEqual({
            spineItemIndex: chapterIndex,
            readingPositionStatus: "success",
          })

        const { navigationCfi, readingPosition } = await readPosition(page)

        return { navigationCfi, readingPosition }
      }

      // At rest, from the start of the book, with the chapter not loaded.
      await goToStartOfBookWithChapterReleased()
      await reader.evaluate((reader, cfi) => {
        reader.navigation.goToCfi(cfi, { animate: false })
      }, cfi)

      const positionForNavigationAtRest =
        await getReadingPositionOnceFoundInChapter()

      expect(positionForNavigationAtRest.navigationCfi).toBe(cfi)

      // The same navigation, before a scroll of the user's is over.
      await goToStartOfBookWithChapterReleased()

      /**
       * In one task of the page, so that the navigation comes well inside the
       * 500 ms that the reader takes a scroll of the user's to last.
       */
      const isNavigationLockedAfterNavigation = await reader.evaluate(
        async (reader, cfi) => {
          const scrollElement =
            reader.navigation.scrollNavigationController.value.element

          if (!scrollElement) throw new Error(`no scroll element`)

          // The reader cannot tell this scroll from one of the user's.
          scrollElement.scrollTo({ top: scrollElement.scrollTop + 150 })

          // The scroll holds the lock from the first move the browser reports.
          await new Promise<void>((resolve) => {
            const lock = reader.navigation.isLocked$.subscribe((isLocked) => {
              if (!isLocked) return

              resolve()
              queueMicrotask(() => lock.unsubscribe())
            })
          })

          reader.navigation.goToCfi(cfi, { animate: false })

          let isNavigationLocked = true

          reader.navigation.isLocked$
            .subscribe((isLocked) => {
              isNavigationLocked = isLocked
            })
            .unsubscribe()

          return isNavigationLocked
        },
        cfi,
      )

      expect
        .soft(
          isNavigationLockedAfterNavigation,
          "whether the scroll still holds the lock, right after the navigation",
        )
        .toBe(false)

      await expect
        .poll(getReadingPositionOnceFoundInChapter)
        .toEqual(positionForNavigationAtRest)
    })
  })
})
