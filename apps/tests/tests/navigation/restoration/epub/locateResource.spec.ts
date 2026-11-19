import { expect } from "@playwright/test"
import {
  getLongChapterIndex,
  navigateToPageOfSpineItem,
  navigateToSpineItem,
  waitForSpineItemUnloaded,
} from "../../../utils"
import {
  layOutAndSettle,
  readSettledPagination,
  waitForSettled,
} from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * A resource is located once the browser is idle, so a reader destroyed right
 * after a resource is located is destroyed before it is located.
 */
test.describe("Given a resource located on a reader destroyed right away", () => {
  test("its result completes as the reader is destroyed", async ({ page }) => {
    await page.goto(url)
    await waitForSettled(page)

    const locateResult = await (await getReader(page)).evaluate((reader) => {
      const item = reader.spineItemsManager.get(1)

      if (!item) return "the book has no second item"

      let isComplete = false

      reader.locateResource(item).subscribe({
        complete: () => {
          isComplete = true
        },
      })
      reader.destroy()

      return isComplete ? "complete" : "still open"
    })

    expect(locateResult).toBe("complete")
  })
})

/**
 * A shallow locate loads nothing. Until the chapter is laid out, it gives the
 * cfi no page: the chapter's first page would be a page the cfi is not on, and
 * a bookmark marker would show there from the moment the chapter is ready
 * until the locate catches up with its layout.
 */
test.describe("Given a cfi past the first page of a chapter that is not loaded, located without loading it", () => {
  test("it gives no page until the chapter is laid out, then the page of the cfi", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(`${url}?preload=0`)
    await waitForSettled(page)

    const chapterIndex = await getLongChapterIndex(page)

    // Its pages exist once it is laid out.
    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)
    await navigateToPageOfSpineItem({
      page,
      spineItemIndex: chapterIndex,
      pageIndex: 3,
    })
    await waitForSettled(page)

    const { cfi, spineItemIndex, beginPageIndex } =
      await readSettledPagination(page)
    const reader = await getReader(page)

    // The cfi of page 3's first visible node may start on page 2: not on the
    // chapter's first page either way.
    expect({
      spineItemIndex,
      beginPageIndex,
      isRootCfi: await reader.evaluate(
        (reader, cfi) => reader.cfi.isRootCfi(cfi),
        cfi,
      ),
    }).toEqual({
      spineItemIndex: chapterIndex,
      beginPageIndex: 3,
      isRootCfi: false,
    })

    await navigateToSpineItem({ page, index: 0 })
    await waitForSettled(page)
    await waitForSpineItemUnloaded(page, [chapterIndex])

    const locatedPages = await reader.evaluateHandle((reader, cfi) => {
      const chapter = reader.spineItemsManager.get(
        reader.cfi.parseCfi(cfi).itemIndex,
      )
      const pages: {
        isChapterReady: boolean | undefined
        itemPageIndex?: number
        absolutePageIndex?: number
      }[] = []

      reader
        .locateResource({ cfi }, { mode: "shallow" })
        .subscribe(({ meta: { itemPageIndex, absolutePageIndex } }) => {
          pages.push({
            isChapterReady: chapter?.value.isReady,
            itemPageIndex,
            absolutePageIndex,
          })
        })

      return pages
    }, cfi)

    // Located once with the chapter unloaded.
    await expect
      .poll(() => locatedPages.evaluate((pages) => pages.length))
      .toBeGreaterThan(0)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)

    // Then located again once the chapter is laid out.
    await expect
      .poll(() =>
        locatedPages.evaluate((pages) =>
          pages.some(({ isChapterReady }) => isChapterReady),
        ),
      )
      .toBe(true)

    const pages = await locatedPages.jsonValue()
    const pageWhileChapterReady = pages.find(
      ({ isChapterReady }) => isChapterReady,
    )?.itemPageIndex

    expect(pageWhileChapterReady).toBeGreaterThan(0)
    expect(
      pages.map(({ itemPageIndex }) => itemPageIndex),
      "every page given is the page of the cfi",
    ).toEqual(
      pages.map(({ itemPageIndex }) =>
        itemPageIndex === undefined ? undefined : pageWhileChapterReady,
      ),
    )
    expect(
      pages.map(({ absolutePageIndex }) => absolutePageIndex === undefined),
      "no absolute page without a page in the chapter",
    ).toEqual(pages.map(({ itemPageIndex }) => itemPageIndex === undefined))
  })
})

/**
 * A larger font lays the chapter out again. Until that layout completes, the
 * chapter's document may already differ from the layout its pages describe,
 * and a page measured then would be neither the page before nor the one after.
 */
test.describe("Given a cfi located in a chapter that a change of font size lays out again", () => {
  test("it gives the page the reader shows for the cfi before the change, then the one after it, and no other", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 536, height: 842 })
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getLongChapterIndex(page)
    const reader = await getReader(page)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)
    await navigateToPageOfSpineItem({
      page,
      spineItemIndex: chapterIndex,
      pageIndex: 3,
    })

    const { cfi } = await readSettledPagination(page)

    // The page the reader shows for the cfi.
    await reader.evaluate((reader, cfi) => reader.navigation.goToCfi(cfi), cfi)

    const shownBefore = await readSettledPagination(page)
    const locatedPages = await reader.evaluateHandle((reader, cfi) => {
      const pages: (number | undefined)[] = []

      reader
        .locateResource({ cfi }, { mode: "shallow" })
        .subscribe(({ meta: { itemPageIndex } }) => {
          pages.push(itemPageIndex)
        })

      return pages
    }, cfi)
    const readLastLocatedPage = () =>
      locatedPages.evaluate((pages) => pages[pages.length - 1])

    await expect.poll(readLastLocatedPage).toBe(shownBefore.beginPageIndex)

    await layOutAndSettle(page, { settings: { fontScale: 1.5 } })
    await reader.evaluate((reader, cfi) => reader.navigation.goToCfi(cfi), cfi)

    const shownAfter = await readSettledPagination(page)

    expect({
      spineItemIndex: shownAfter.spineItemIndex,
      isRootCfi: await reader.evaluate(
        (reader, cfi) => reader.cfi.isRootCfi(cfi),
        cfi,
      ),
      hasPageOfCfiMoved:
        shownAfter.beginPageIndex !== shownBefore.beginPageIndex,
    }).toEqual({
      spineItemIndex: chapterIndex,
      isRootCfi: false,
      hasPageOfCfiMoved: true,
    })

    await expect.poll(readLastLocatedPage).toBe(shownAfter.beginPageIndex)

    const pages = await locatedPages.jsonValue()

    expect(
      pages.filter(
        (itemPageIndex) =>
          itemPageIndex !== undefined &&
          itemPageIndex !== shownBefore.beginPageIndex &&
          itemPageIndex !== shownAfter.beginPageIndex,
      ),
      `the pages given that are neither the page before the change nor the one after it, among ${JSON.stringify(pages)}`,
    ).toEqual([])
  })
})
