import { expect } from "@playwright/test"
import {
  getLongChapterIndex,
  navigateToPageOfSpineItem,
  navigateToSpineItem,
  waitForSpineItemUnloaded,
} from "../../../utils"
import {
  readSettledPagination,
  waitForSettled,
} from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { test } from "../../../utils/test"

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * The locator sets up once the browser is idle, so a reader destroyed right
 * after a resource is located is destroyed before the locator starts.
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
