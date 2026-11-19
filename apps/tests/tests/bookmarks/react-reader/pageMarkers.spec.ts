import { expect, type Page } from "@playwright/test"
import {
  getLongChapterIndex,
  navigateToPageOfSpineItem,
  navigateToSpineItem,
  waitForSpineItemUnloaded,
} from "../../utils"
import { readSettledPagination, waitForSettled } from "../../utils/pagination"
import { test } from "../../utils/test"

const url = "http://localhost:3333/tests/bookmarks/react-reader/index.html"
const windowSize = { width: 600, height: 800 }
const marker = "[data-bookmark-area]"

/**
 * Records each bookmark marker react-reader puts in the page from now on, and
 * whether it was in the window as it went in. A marker is put in when its
 * page gets a bookmark, so one put in on a wrong page shows there, however
 * short a time it stays.
 */
const recordMarkersPutIn = (page: Page) =>
  page.evaluateHandle((marker) => {
    const markersPutIn: { isInWindow: boolean }[] = []
    const isInWindow = (element: Element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect()

      return (
        right > 0 &&
        bottom > 0 &&
        left < window.innerWidth &&
        top < window.innerHeight
      )
    }

    new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (!(node instanceof Element)) continue

          const markers = node.matches(marker)
            ? [node]
            : [...node.querySelectorAll(marker)]

          for (const element of markers) {
            markersPutIn.push({ isInWindow: isInWindow(element) })
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true })

    return markersPutIn
  }, marker)

test.describe("Given a page bookmarked in the middle of a chapter", () => {
  test("its marker shows on that page only, also once the book opens again away from it", async ({
    page,
  }) => {
    await page.setViewportSize(windowSize)
    await page.goto(url)
    await waitForSettled(page)

    const chapterIndex = await getLongChapterIndex(page)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)
    await navigateToPageOfSpineItem({
      page,
      spineItemIndex: chapterIndex,
      pageIndex: 3,
    })

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: chapterIndex,
      beginPageIndex: 3,
    })

    // A tap on the top right corner of the page bookmarks it.
    await page.mouse.click(windowSize.width - 10, 10)

    await expect(page.locator(marker)).toHaveCount(1)
    await expect(page.locator(marker)).toBeInViewport()

    // Away from the chapter, which unloads: its page shows no marker.
    await navigateToSpineItem({ page, index: 0 })
    await waitForSettled(page)
    await waitForSpineItemUnloaded(page, [chapterIndex])

    await expect(page.locator(marker)).toHaveCount(0)

    // Opened again, the book locates the bookmark before its chapter ever
    // loads.
    await page.reload()
    await waitForSettled(page)

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: 0,
    })
    await expect(page.locator(marker)).toHaveCount(0)

    const markersPutIn = await recordMarkersPutIn(page)

    // On the chapter's first page, which has no bookmark.
    await navigateToSpineItem({ page, index: chapterIndex })

    expect(await readSettledPagination(page)).toMatchObject({
      spineItemIndex: chapterIndex,
      beginPageIndex: 0,
    })

    // The chapter is laid out and its bookmark located: the marker is on the
    // bookmarked page, out of the window.
    await expect(page.locator(marker)).toHaveCount(1)
    await expect(page.locator(marker)).not.toBeInViewport()

    expect(
      await markersPutIn.jsonValue(),
      "no marker went in on the first page of the chapter",
    ).toEqual([{ isInWindow: false }])

    await navigateToPageOfSpineItem({
      page,
      spineItemIndex: chapterIndex,
      pageIndex: 3,
    })
    await waitForSettled(page)

    await expect(page.locator(marker)).toHaveCount(1)
    await expect(page.locator(marker)).toBeInViewport()
  })
})
