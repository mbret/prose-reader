import { expect, type Page } from "@playwright/test"
import { getLongChapterIndex, navigateToSpineItem } from "../../../utils"
import {
  layOutAndSettle,
  readSettledPagination,
  waitForSettled,
  waitForSettledOnCurrentLayout,
} from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"
import { readPosition } from "./position"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

const openBookThatScrolls = async (page: Page) => {
  await page.setViewportSize({ width: 536, height: 842 })
  await page.goto(url)
  await waitForSettled(page)
  await layOutAndSettle(page, {
    settings: { pageTurnMode: "scrollable" },
  })
}

const goToStartOfBookWithChapterReleased = async (
  page: Page,
  chapterIndex: number,
) => {
  const reader = await getReader(page)

  await navigateToSpineItem({ page, index: 0 })
  await page.waitForFunction(
    ({ reader, chapterIndex }) =>
      reader.spineItemsManager.get(chapterIndex)?.value.loadStatus === "idle",
    { reader, chapterIndex },
  )
  await waitForSettledOnCurrentLayout(page)
}

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
      await openBookThatScrolls(page)

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
      await goToStartOfBookWithChapterReleased(page, chapterIndex)
      await reader.evaluate((reader, cfi) => {
        reader.navigation.goToCfi(cfi, { animate: false })
      }, cfi)

      const positionForNavigationAtRest =
        await getReadingPositionOnceFoundInChapter()

      expect(positionForNavigationAtRest.navigationCfi).toBe(cfi)

      // The same navigation, before a scroll of the user's is over.
      await goToStartOfBookWithChapterReleased(page, chapterIndex)

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

  /**
   * The reader follows the scroll: at each move it navigates to where the
   * book is. A navigation that starts from where the reader is, as a page
   * turn does, then starts from where the scroll has taken the book.
   */
  test.describe("When the app goes to the next spine item", () => {
    test("Then the reader goes to the spine item it goes to for the same navigation made once the scroll is over", async ({
      page,
    }) => {
      await openBookThatScrolls(page)

      const reader = await getReader(page)
      const chapterIndex = await getLongChapterIndex(page)

      const scrollToChapterAsUserThenGoToNextSpineItem = (
        whenToGoToNextSpineItem: "asScrollBegins" | "onceScrollIsOver",
      ) =>
        reader.evaluate(
          async (reader, { chapterIndex, whenToGoToNextSpineItem }) => {
            const scrollElement =
              reader.navigation.scrollNavigationController.value.element

            if (!scrollElement) throw new Error(`no scroll element`)

            // The scroll holds the lock from its first move until it is over.
            const lockBecomes = (isLockedToWaitFor: boolean) =>
              new Promise<void>((resolve) => {
                const lock = reader.navigation.isLocked$.subscribe(
                  (isLocked) => {
                    if (isLocked !== isLockedToWaitFor) return

                    resolve()
                    queueMicrotask(() => lock.unsubscribe())
                  },
                )
              })

            const { top } =
              reader.spine.getSpineItemSpineLayoutInfo(chapterIndex)

            // The reader cannot tell this scroll from one of the user's.
            scrollElement.scrollTo({ top })
            await lockBecomes(true)

            if (whenToGoToNextSpineItem === "onceScrollIsOver")
              await lockBecomes(false)

            reader.navigation.goToNextSpineItem()
          },
          { chapterIndex, whenToGoToNextSpineItem },
        )

      const getSpineItemReaderIsOn = async () =>
        (await readSettledPagination(page)).spineItemIndex

      await goToStartOfBookWithChapterReleased(page, chapterIndex)
      await scrollToChapterAsUserThenGoToNextSpineItem("onceScrollIsOver")

      const spineItemForNavigationOnceScrollIsOver =
        await getSpineItemReaderIsOn()

      // From the chapter, not from the first spine item, where the scroll began.
      expect(spineItemForNavigationOnceScrollIsOver).toBeGreaterThan(
        chapterIndex,
      )

      await goToStartOfBookWithChapterReleased(page, chapterIndex)
      await scrollToChapterAsUserThenGoToNextSpineItem("asScrollBegins")

      await expect
        .poll(getSpineItemReaderIsOn)
        .toBe(spineItemForNavigationOnceScrollIsOver)
    })
  })
})
