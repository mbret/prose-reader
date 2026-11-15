import { expect, type Page } from "@playwright/test"
import { navigateToPageOfSpineItem, turnLeft, turnRight } from "../../utils"
import { layOutAndSettle, readSettledPagination } from "../../utils/pagination"
import { test } from "../../utils/test"
import {
  isCfiPositionVisible,
  readCfiPositionInWindow,
} from "../../utils/visibility"
import type { ScenarioBook } from "./books"
import {
  getScreenOfPage,
  goToLongChapter,
  ODD_SPREAD_WINDOW,
  openBook,
  readFirstShownNode,
  readPagesOfShownSpineItem,
  SINGLE_PAGE_WINDOW,
  SPREAD_WINDOW,
  tapAndReadTappedPage,
  turnScreensOfChapter,
} from "./pages"

type Turn = (params: { page: Page }) => Promise<void>

type Size = { width: number; height: number }

type ChapterScreen =
  | { pagesPerScreen: 1 }
  | { pagesPerScreen: 2; firstPageSide: "left" | "right" }

/** What tells the books of this scenario apart. */
type BookCase = {
  book: ScenarioBook
  turnToNextPage: Turn
  turnToPreviousPage: Turn
  /** Where the page `pageIndex` is in its item, from the item's top-left. */
  getPagePosition: (
    pageIndex: number,
    sizes: { itemSize: Size; pageSize: Size },
  ) => { x: number; y: number }
  screenInSpread: ChapterScreen
}

const BOOK_CASES: BookCase[] = [
  {
    book: "ltr",
    turnToNextPage: turnRight,
    turnToPreviousPage: turnLeft,
    getPagePosition: (pageIndex, { pageSize }) => ({
      x: pageIndex * pageSize.width,
      y: 0,
    }),
    screenInSpread: { pagesPerScreen: 2, firstPageSide: "left" },
  },
  {
    book: "rtl",
    turnToNextPage: turnLeft,
    turnToPreviousPage: turnRight,
    getPagePosition: (pageIndex, { itemSize, pageSize }) => ({
      x: itemSize.width - (pageIndex + 1) * pageSize.width,
      y: 0,
    }),
    screenInSpread: { pagesPerScreen: 2, firstPageSide: "right" },
  },
  {
    book: "vertical-rl",
    turnToNextPage: turnLeft,
    turnToPreviousPage: turnRight,
    getPagePosition: (pageIndex, { pageSize }) => ({
      x: 0,
      y: pageIndex * pageSize.height,
    }),
    // A page of vertical writing is as wide as the spread, so a spread shows one.
    screenInSpread: { pagesPerScreen: 1 },
  },
]

const WINDOWS = [
  { name: "one page", window: SINGLE_PAGE_WINDOW },
  { name: "a spread", window: SPREAD_WINDOW },
  { name: "a spread of an odd width", window: ODD_SPREAD_WINDOW },
]

const TAP_POINT = { x: 200, y: 300 }

const FONT_SCALE_STEPS = [
  0.99, 0.98, 0.97, 0.96, 0.95, 0.94, 0.93, 0.92, 0.91, 0.9,
]

for (const {
  book,
  turnToNextPage,
  turnToPreviousPage,
  getPagePosition,
  screenInSpread,
} of BOOK_CASES) {
  test.describe(`Given a long chapter of the ${book} book`, () => {
    test("places its pages one page apart, in reading order", async ({
      page,
    }) => {
      await openBook(page, book, SINGLE_PAGE_WINDOW)
      await goToLongChapter(page, book)
      const { numberOfPages, pages, itemSize, pageSize } =
        await readPagesOfShownSpineItem(page)

      expect(pages).toHaveLength(numberOfPages)
      expect(pages).toEqual(
        pages.map(({ pageIndex }) => ({
          pageIndex,
          ...getPagePosition(pageIndex, { itemSize, pageSize }),
        })),
      )
      expect(pages.map(({ pageIndex }) => pageIndex)).toEqual(
        pages.map((_, index) => index),
      )
    })

    test("gives a tap on its first page, and where in it, to the beforeTapGesture hooks", async ({
      page,
    }) => {
      await openBook(page, book, SINGLE_PAGE_WINDOW)
      const { chapterIndex } = await goToLongChapter(page, book)

      expect(await tapAndReadTappedPage(page, TAP_POINT)).toEqual({
        spineItemIndex: chapterIndex,
        spineItemPageIndex: 0,
        spineItemPagePosition: TAP_POINT,
        pageSize: SINGLE_PAGE_WINDOW.size,
      })
    })

    test("gives a tap on a later page, and where in it, to the beforeTapGesture hooks", async ({
      page,
    }) => {
      await openBook(page, book, SINGLE_PAGE_WINDOW)
      const { chapterIndex } = await goToLongChapter(page, book)

      await turnScreensOfChapter(page, {
        turnToNextPage,
        chapterIndex,
        pagesPerScreen: 1,
        numberOfScreens: 3,
      })

      expect(await tapAndReadTappedPage(page, TAP_POINT)).toEqual({
        spineItemIndex: chapterIndex,
        spineItemPageIndex: 3,
        spineItemPagePosition: TAP_POINT,
        pageSize: SINGLE_PAGE_WINDOW.size,
      })
    })

    for (const { name, window } of WINDOWS) {
      const chapterScreen: ChapterScreen =
        window.pagesPerScreen === 2 ? screenInSpread : { pagesPerScreen: 1 }
      const { pagesPerScreen } = chapterScreen

      test.describe(`When the window shows ${name}`, () => {
        /**
         * A smaller font scale moves the text to earlier pages, and can keep the
         * chapter's number of pages, and so its size. Which step keeps it differs
         * per browser and per book, so the test runs ten small steps.
         */
        test("keeps the first node shown on screen as a smaller font scale moves the text", async ({
          page,
        }) => {
          await openBook(page, book, window)
          const { chapterIndex } = await goToLongChapter(page, book)

          await turnScreensOfChapter(page, {
            turnToNextPage,
            chapterIndex,
            pagesPerScreen,
            numberOfScreens: 3,
          })

          const { cfi } = await readFirstShownNode(page)
          let { numberOfPages, beginPageIndex } =
            await readSettledPagination(page)
          let stepsThatMovedTheNodeOnly = 0

          for (const fontScale of FONT_SCALE_STEPS) {
            await layOutAndSettle(page, { settings: { fontScale } })

            expect(
              await isCfiPositionVisible(page, cfi),
              `whether the first node shown is on screen at a font scale of ${fontScale}`,
            ).toBe(true)

            const pagination = await readSettledPagination(page)

            if (
              pagination.numberOfPages === numberOfPages &&
              pagination.beginPageIndex !== beginPageIndex
            ) {
              stepsThatMovedTheNodeOnly++
            }

            numberOfPages = pagination.numberOfPages
            beginPageIndex = pagination.beginPageIndex
          }

          // A step that changes the number of pages changes the chapter's size,
          // and the reader finds the node again after any size change.
          expect(
            stepsThatMovedTheNodeOnly,
            "the number of steps that moved the node to another page and kept the chapter's number of pages",
          ).toBeGreaterThan(0)
        })

        test("turns through the pages in reading order", async ({ page }) => {
          await openBook(page, book, window)
          const { chapterIndex } = await goToLongChapter(page, book)

          await turnScreensOfChapter(page, {
            turnToNextPage,
            chapterIndex,
            pagesPerScreen,
            numberOfScreens: 3,
          })

          await turnToPreviousPage({ page })
          await expect
            .poll(() => readSettledPagination(page))
            .toMatchObject({
              spineItemIndex: chapterIndex,
              ...getScreenOfPage(2 * pagesPerScreen, pagesPerScreen),
            })
        })

        test("goes to a page, and to the last page", async ({ page }) => {
          await openBook(page, book, window)
          const { chapterIndex, numberOfPages } = await goToLongChapter(
            page,
            book,
          )

          await navigateToPageOfSpineItem({
            page,
            spineItemIndex: chapterIndex,
            pageIndex: 5,
          })
          await expect
            .poll(() => readSettledPagination(page))
            .toMatchObject({
              spineItemIndex: chapterIndex,
              ...getScreenOfPage(5, pagesPerScreen),
            })

          const lastPageIndex = numberOfPages - 1

          await navigateToPageOfSpineItem({
            page,
            spineItemIndex: chapterIndex,
            pageIndex: lastPageIndex,
          })
          // The page after the last one may belong to the next spine item.
          await expect
            .poll(() => readSettledPagination(page))
            .toMatchObject({
              spineItemIndex: chapterIndex,
              beginPageIndex: getScreenOfPage(lastPageIndex, pagesPerScreen)
                .beginPageIndex,
            })
        })

        test("finds the first node shown on the first page shown", async ({
          page,
        }) => {
          await openBook(page, book, window)
          const { chapterIndex } = await goToLongChapter(page, book)

          await turnScreensOfChapter(page, {
            turnToNextPage,
            chapterIndex,
            pagesPerScreen,
            numberOfScreens: 3,
          })

          const { cfi, pageIndex } = await readFirstShownNode(page)

          expect(pageIndex, "the page the reader finds the node on").toBe(
            3 * pagesPerScreen,
          )

          const position = await readCfiPositionInWindow(page, cfi)

          if (typeof position === "string") throw new Error(position)

          const firstPageWidth = position.window.width / pagesPerScreen
          const firstPageLeft =
            chapterScreen.pagesPerScreen === 2 &&
            chapterScreen.firstPageSide === "right"
              ? firstPageWidth
              : 0

          expect(
            position.x,
            "the node is on the first page shown",
          ).toBeGreaterThanOrEqual(firstPageLeft)
          expect(
            position.x,
            "the node is on the first page shown",
          ).toBeLessThan(firstPageLeft + firstPageWidth)
          expect(
            position.y,
            "the node is in the window",
          ).toBeGreaterThanOrEqual(0)
          expect(position.y, "the node is in the window").toBeLessThan(
            position.window.height,
          )
        })
      })
    }
  })
}
