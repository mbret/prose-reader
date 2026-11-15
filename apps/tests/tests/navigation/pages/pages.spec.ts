import { expect } from "@playwright/test"
import { turnLeft, turnRight } from "../../utils"
import { getReader } from "../../utils/reader"
import { test } from "../../utils/test"
import {
  goToLongChapter,
  openBook,
  readPageIndexOfFirstShownNode,
  readPagesOfSpineItem,
  readShownPages,
  SINGLE_PAGE_WINDOW,
  SPREAD_WINDOW,
  tapAndReadTappedPage,
} from "./pages"

/**
 * The pages of a long reflowable chapter: where the reader places them, how
 * a page turn and a navigation to a page reach them, which page a node and a
 * tap fall on. The same book reads left to right, right to left, and in
 * vertical writing, so each way runs through the code that tells them apart.
 */

const TAP_POINT = { x: 200, y: 300 }

for (const book of ["ltr", "rtl"] as const) {
  const turnToNextPage = book === "ltr" ? turnRight : turnLeft
  const turnToPreviousPage = book === "ltr" ? turnLeft : turnRight

  test.describe(`Given a long chapter of the ${book} book`, () => {
    test("places its pages one page apart, from its start edge", async ({
      page,
    }) => {
      await openBook(page, book, SINGLE_PAGE_WINDOW)
      const chapterIndex = await goToLongChapter(page)
      const { numberOfPages } = await readShownPages(page)
      const { pageStarts, itemSize, pageSize } = await readPagesOfSpineItem(
        page,
        chapterIndex,
      )

      expect(pageStarts).toHaveLength(numberOfPages)
      expect(pageStarts).toEqual(
        pageStarts.map((_, pageIndex) => ({
          x:
            book === "ltr"
              ? pageIndex * pageSize.width
              : itemSize.width - (pageIndex + 1) * pageSize.width,
          y: 0,
        })),
      )
    })

    for (const [windowName, windowSize, pagesPerScreen] of [
      ["one page", SINGLE_PAGE_WINDOW, 1],
      ["a spread", SPREAD_WINDOW, 2],
    ] as const) {
      test.describe(`When the window shows ${windowName}`, () => {
        test("turns through the pages in reading order", async ({ page }) => {
          await openBook(page, book, windowSize)
          const chapterIndex = await goToLongChapter(page)

          for (const screen of [1, 2, 3]) {
            await turnToNextPage({ page })
            await expect
              .poll(() => readShownPages(page))
              .toMatchObject({
                spineItemIndex: chapterIndex,
                beginPageIndex: screen * pagesPerScreen,
                endPageIndex: screen * pagesPerScreen + pagesPerScreen - 1,
              })
          }

          await turnToPreviousPage({ page })
          await expect
            .poll(() => readShownPages(page))
            .toMatchObject({
              spineItemIndex: chapterIndex,
              beginPageIndex: 2 * pagesPerScreen,
            })
        })

        test("goes to a page, and to the last page", async ({ page }) => {
          await openBook(page, book, windowSize)
          const chapterIndex = await goToLongChapter(page)
          const reader = await getReader(page)
          const goToPage = (pageIndex: number) =>
            reader.evaluate(
              (reader, { spineItemId, pageIndex }) => {
                reader.navigation.goToPageOfSpineItem({
                  spineItemId,
                  pageIndex,
                })
              },
              { spineItemId: chapterIndex, pageIndex },
            )

          await goToPage(5)
          await expect
            .poll(async () => {
              const { beginPageIndex, endPageIndex } =
                await readShownPages(page)

              return (beginPageIndex ?? -1) <= 5 && 5 <= (endPageIndex ?? -1)
            }, "page 5 is shown")
            .toBe(true)

          const { numberOfPages } = await readShownPages(page)

          await goToPage(numberOfPages - 1)
          await expect
            .poll(() => readShownPages(page))
            .toMatchObject({
              spineItemIndex: chapterIndex,
              endPageIndex: numberOfPages - 1,
            })
        })

        test("finds the first node shown on the first page shown", async ({
          page,
        }) => {
          await openBook(page, book, windowSize)
          const chapterIndex = await goToLongChapter(page)

          for (const screen of [1, 2, 3]) {
            await turnToNextPage({ page })
            await expect
              .poll(() => readShownPages(page))
              .toMatchObject({
                spineItemIndex: chapterIndex,
                beginPageIndex: screen * pagesPerScreen,
              })
          }

          expect(await readPageIndexOfFirstShownNode(page)).toBe(
            3 * pagesPerScreen,
          )
        })
      })
    }

    test("gives a tap's page, and where in it, to the beforeTapGesture hooks", async ({
      page,
    }) => {
      await openBook(page, book, SINGLE_PAGE_WINDOW)
      const chapterIndex = await goToLongChapter(page)

      for (const pageIndex of [1, 2, 3]) {
        await turnToNextPage({ page })
        await expect
          .poll(async () => (await readShownPages(page)).beginPageIndex)
          .toBe(pageIndex)
      }

      const tappedPage = await tapAndReadTappedPage(page, TAP_POINT)

      expect(tappedPage).toEqual({
        spineItemIndex: chapterIndex,
        pageIndex: 3,
        positionInPage: TAP_POINT,
        pageSize: SINGLE_PAGE_WINDOW,
      })
    })
  })
}

/**
 * The pages of a chapter in vertical writing go down the chapter. Only its
 * first page is reached here: a navigation lower in the chapter is held at
 * the height of the last spine item, which is one page.
 */
test.describe("Given a long chapter of the vertical-rl book", () => {
  test("places its pages one page apart, from the top down", async ({
    page,
  }) => {
    await openBook(page, "vertical-rl", SINGLE_PAGE_WINDOW)
    const chapterIndex = await goToLongChapter(page)
    const { numberOfPages } = await readShownPages(page)
    const { pageStarts, pageSize } = await readPagesOfSpineItem(
      page,
      chapterIndex,
    )

    expect(pageStarts).toHaveLength(numberOfPages)
    expect(pageStarts).toEqual(
      pageStarts.map((_, pageIndex) => ({
        x: 0,
        y: pageIndex * pageSize.height,
      })),
    )
  })

  test("gives a tap's page, and where in it, to the beforeTapGesture hooks", async ({
    page,
  }) => {
    await openBook(page, "vertical-rl", SINGLE_PAGE_WINDOW)
    const chapterIndex = await goToLongChapter(page)

    const tappedPage = await tapAndReadTappedPage(page, TAP_POINT)

    expect(tappedPage).toEqual({
      spineItemIndex: chapterIndex,
      pageIndex: 0,
      positionInPage: TAP_POINT,
      pageSize: SINGLE_PAGE_WINDOW,
    })
  })
})
