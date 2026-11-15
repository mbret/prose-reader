import { expect, type Page } from "@playwright/test"
import { getLongChapterIndex, navigateToSpineItem } from "../../utils"
import { waitForSettled } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import type { BookDirection, TappedPage } from "./types"

/** One page fills a portrait window; two pages, a spread, fill a landscape one. */
export const SINGLE_PAGE_WINDOW = { width: 600, height: 800 }
export const SPREAD_WINDOW = { width: 1200, height: 800 }

export const openBook = async (
  page: Page,
  book: BookDirection,
  windowSize: { width: number; height: number },
) => {
  await page.setViewportSize(windowSize)
  await page.goto(
    `http://localhost:3333/tests/navigation/pages/index.html?book=${book}`,
  )
  await waitForSettled(page)
}

/** The pages the settled result shows, and the spine item they belong to. */
export const readShownPages = async (page: Page) => {
  const reader = await getReader(page)
  const handle = await page.waitForFunction((reader) => {
    const { isSettled, begin, end } = reader.pagination.state

    if (!isSettled) return undefined

    return {
      spineItemIndex: begin.spineItemIndex,
      beginPageIndex: begin.pageIndexInSpineItem,
      endPageIndex: end.pageIndexInSpineItem,
      numberOfPages: begin.numberOfPagesInSpineItem,
      cfi: begin.cfi,
    }
  }, reader)

  const shownPages = await handle.jsonValue()

  if (!shownPages) throw new Error("no settled pagination result")

  return shownPages
}

/** Goes to the first page of `ch02.xhtml`, a chapter of many pages. */
export const goToLongChapter = async (page: Page) => {
  const chapterIndex = await getLongChapterIndex(page)

  await navigateToSpineItem({ page, index: chapterIndex })
  await expect
    .poll(async () => (await readShownPages(page)).spineItemIndex)
    .toBe(chapterIndex)

  const shownPages = await readShownPages(page)

  expect(shownPages.beginPageIndex, "the chapter opens on its first page").toBe(
    0,
  )
  expect(
    shownPages.numberOfPages,
    "the chapter has many pages",
  ).toBeGreaterThan(8)

  return chapterIndex
}

/**
 * The pages the reader lists for a spine item, each where it starts in the
 * item, in page order; the item's place in the spine; and the page size.
 */
export const readPagesOfSpineItem = async (
  page: Page,
  spineItemIndex: number,
) =>
  (await getReader(page)).evaluate((reader, spineItemIndex) => {
    const itemLayout = reader.spine.getSpineItemSpineLayoutInfo(spineItemIndex)

    return {
      pageStarts: reader.spine.pages.value.pages
        .filter(({ itemIndex }) => itemIndex === spineItemIndex)
        .map(({ absoluteLayout }) => ({
          x: absoluteLayout.left - itemLayout.left,
          y: absoluteLayout.top - itemLayout.top,
        })),
      itemSize: { width: itemLayout.width, height: itemLayout.height },
      pageSize: reader.viewport.value.pageSize,
    }
  }, spineItemIndex)

/** The page of the node that the cfi of the first page shown names. */
export const readPageIndexOfFirstShownNode = async (page: Page) => {
  const { cfi } = await readShownPages(page)

  return (await getReader(page)).evaluate((reader, cfi) => {
    if (!cfi || reader.cfi.isRootCfi(cfi)) {
      throw new Error(`the first page shown has no node cfi: ${cfi}`)
    }

    const { node, offset, spineItem } = reader.cfi.resolveCfi({ cfi })

    if (!node || !spineItem) throw new Error(`${cfi} names no node`)

    return reader.spine.locator.getSpineItemPageIndexFromNode(
      node,
      offset ?? 0,
      spineItem,
    )
  }, cfi)
}

/**
 * Taps at a point of the window, and gives the page that the
 * `beforeTapGesture` hooks got for the tap. The scenario records it.
 */
export const tapAndReadTappedPage = async (
  page: Page,
  point: { x: number; y: number },
) => {
  const readTappedPages = () =>
    page.evaluate(
      () =>
        // @ts-expect-error set by this scenario's index.tsx
        window.tappedPages as TappedPage[],
    )
  const numberOfTapsBefore = (await readTappedPages()).length

  await page.mouse.click(point.x, point.y)
  await expect
    .poll(async () => (await readTappedPages()).length)
    .toBe(numberOfTapsBefore + 1)

  const tappedPages = await readTappedPages()

  return tappedPages[tappedPages.length - 1]
}
