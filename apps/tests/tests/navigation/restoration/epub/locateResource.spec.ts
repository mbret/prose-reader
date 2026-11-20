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
 * The first reading of a located resource waits for the browser to be idle,
 * so a reader destroyed right after `locateResource()` is destroyed before
 * that reading.
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
 * A larger font lays the chapter out again. Until its pages are published, the
 * chapter's document may already differ from the layout the published pages
 * describe, and a page measured then could be neither the page before nor the
 * one after.
 */
test.describe("Given cfis of a chapter that a change of font size lays out again", () => {
  test("a cfi located before keeps the page the reader shows for it until the new pages are published, and one located meanwhile has a page only once they are", async ({
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
      pageIndex: 5,
    })

    const { cfi: cfiLocatedMeanwhile } = await readSettledPagination(page)

    await navigateToPageOfSpineItem({
      page,
      spineItemIndex: chapterIndex,
      pageIndex: 3,
    })

    const { cfi: cfiLocatedBefore } = await readSettledPagination(page)

    // Show the cfi's own page: the cfi of page 3's first visible node may
    // start on page 2.
    await reader.evaluate(
      (reader, cfi) => reader.navigation.goToCfi(cfi),
      cfiLocatedBefore,
    )

    const shownBefore = await readSettledPagination(page)
    const locatedPages = await reader.evaluateHandle(
      (reader, { cfiLocatedBefore, cfiLocatedMeanwhile }) => {
        type LocatedPage = {
          itemPageIndex: number | undefined
          isChapterLayoutCurrent: boolean
        }

        const located: {
          before: LocatedPage[]
          meanwhile: LocatedPage[]
          isChapterLayoutCurrentAsLocatedMeanwhile?: boolean
        } = { before: [], meanwhile: [] }
        const record =
          (pages: LocatedPage[]) =>
          ({
            meta: { itemIndex, itemPageIndex },
          }: {
            meta: { itemIndex: number; itemPageIndex?: number }
          }) => {
            pages.push({
              itemPageIndex,
              isChapterLayoutCurrent:
                reader.spine.isLayoutCurrentFor(itemIndex),
            })
          }

        reader
          .locateResource({ cfi: cfiLocatedBefore }, { mode: "shallow" })
          .subscribe(record(located.before))

        // Located as the pass of the next layout starts.
        reader.spine.itemsLayoutStart$.subscribe(() => {
          if (located.isChapterLayoutCurrentAsLocatedMeanwhile !== undefined)
            return

          located.isChapterLayoutCurrentAsLocatedMeanwhile =
            reader.spine.isLayoutCurrentFor(
              reader.cfi.parseCfi(cfiLocatedMeanwhile).itemIndex,
            )

          reader
            .locateResource({ cfi: cfiLocatedMeanwhile }, { mode: "shallow" })
            .subscribe(record(located.meanwhile))
        })

        return located
      },
      { cfiLocatedBefore, cfiLocatedMeanwhile },
    )
    const readLastLocatedPage = (which: "before" | "meanwhile") =>
      locatedPages.evaluate(
        (located, which) =>
          located[which][located[which].length - 1]?.itemPageIndex,
        which,
      )

    await expect
      .poll(() => readLastLocatedPage("before"))
      .toBe(shownBefore.beginPageIndex)

    await layOutAndSettle(page, { settings: { fontScale: 1.5 } })
    await reader.evaluate(
      (reader, cfi) => reader.navigation.goToCfi(cfi),
      cfiLocatedBefore,
    )

    const shownAfter = await readSettledPagination(page)

    await expect
      .poll(() => readLastLocatedPage("before"))
      .toBe(shownAfter.beginPageIndex)

    await reader.evaluate(
      (reader, cfi) => reader.navigation.goToCfi(cfi),
      cfiLocatedMeanwhile,
    )

    const shownForCfiLocatedMeanwhile = await readSettledPagination(page)

    await expect
      .poll(() => readLastLocatedPage("meanwhile"))
      .toBe(shownForCfiLocatedMeanwhile.beginPageIndex)

    const located = await locatedPages.jsonValue()
    const pagesOfCfiLocatedBefore = located.before
      .map(({ itemPageIndex }) => itemPageIndex)
      .filter((pageIndex, index, pages) => pageIndex !== pages[index - 1])

    expect({
      spineItemIndex: shownAfter.spineItemIndex,
      isRootCfi: await reader.evaluate(
        (reader, cfis) => cfis.some((cfi) => reader.cfi.isRootCfi(cfi)),
        [cfiLocatedBefore, cfiLocatedMeanwhile],
      ),
      hasPageOfCfiMoved:
        shownAfter.beginPageIndex !== shownBefore.beginPageIndex,
      isChapterLayoutCurrentAsLocatedMeanwhile:
        located.isChapterLayoutCurrentAsLocatedMeanwhile,
    }).toEqual({
      spineItemIndex: chapterIndex,
      isRootCfi: false,
      hasPageOfCfiMoved: true,
      isChapterLayoutCurrentAsLocatedMeanwhile: false,
    })
    expect(
      pagesOfCfiLocatedBefore,
      "the pages of the cfi located before the change, as they changed",
    ).toEqual([shownBefore.beginPageIndex, shownAfter.beginPageIndex])
    expect(
      located.meanwhile.filter(
        ({ itemPageIndex, isChapterLayoutCurrent }) =>
          itemPageIndex !== undefined && !isChapterLayoutCurrent,
      ),
      "the pages given to the cfi located meanwhile while the published pages did not describe the chapter's latest layout",
    ).toEqual([])
  })
})
