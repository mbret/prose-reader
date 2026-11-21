import { expect, type Page } from "@playwright/test"
import { getLongChapterIndex, navigateToSpineItem } from "../../utils"
import { readSettledPagination } from "../../utils/pagination"
import { getReader } from "../../utils/reader"
import type { ScenarioBook } from "../../utils/scenarioBooks"
import type { TappedPage } from "./books"

export type ScenarioWindow = {
  size: { width: number; height: number }
  pagesPerScreen: number
}

export const SINGLE_PAGE_WINDOW: ScenarioWindow = {
  size: { width: 600, height: 800 },
  pagesPerScreen: 1,
}

export const SPREAD_WINDOW: ScenarioWindow = {
  size: { width: 1200, height: 800 },
  pagesPerScreen: 2,
}

/** A spread whose pages are half a pixel wider than a whole pixel count. */
export const ODD_SPREAD_WINDOW: ScenarioWindow = {
  size: { width: 1201, height: 800 },
  pagesPerScreen: 2,
}

export const openBook = async (
  page: Page,
  book: ScenarioBook,
  { size, pagesPerScreen }: ScenarioWindow,
) => {
  await page.setViewportSize(size)
  await page.goto(
    `http://localhost:3333/tests/navigation/pages/index.html?book=${book}`,
  )
  await readSettledPagination(page)

  const viewport = await (await getReader(page)).evaluate((reader) => ({
    isSpread: reader.viewport.value.isSpread,
    pageWidth: reader.viewport.value.pageSize.width,
  }))

  expect(viewport, `the window shows ${pagesPerScreen} page(s)`).toEqual({
    isSpread: pagesPerScreen === 2,
    pageWidth: size.width / pagesPerScreen,
  })
}

/** The pages a window shows together when it shows the page `pageIndex`. */
export const getScreenOfPage = (pageIndex: number, pagesPerScreen: number) => {
  const beginPageIndex = Math.floor(pageIndex / pagesPerScreen) * pagesPerScreen

  return {
    beginPageIndex,
    endPageIndex: beginPageIndex + pagesPerScreen - 1,
  }
}

export const goToLongChapter = async (page: Page, book: ScenarioBook) => {
  const chapterIndex = await getLongChapterIndex(page)

  await navigateToSpineItem({ page, index: chapterIndex })

  const { spineItemIndex, beginPageIndex, numberOfPages } =
    await readSettledPagination(page)

  expect(spineItemIndex, "the long chapter is shown").toBe(chapterIndex)
  expect(beginPageIndex, "the chapter opens on its first page").toBe(0)
  expect(numberOfPages, "the chapter has many pages").toBeGreaterThan(8)

  const bookAsRead = await (await getReader(page)).evaluate(
    (reader, chapterIndex) => ({
      isRTL: reader.context.isRTL(),
      isUsingVerticalWriting: Boolean(
        reader.spineItemsManager.get(chapterIndex)?.isUsingVerticalWriting(),
      ),
    }),
    chapterIndex,
  )

  expect(bookAsRead, `the reader reads the ${book} book as one`).toEqual({
    isRTL: book !== "ltr",
    isUsingVerticalWriting: book === "vertical-rl",
  })

  return { chapterIndex, numberOfPages }
}

/**
 * Turns `numberOfScreens` times from the first screen of a chapter, and
 * checks after each turn that the window shows the next screen of the
 * chapter.
 */
export const turnScreensOfChapter = async (
  page: Page,
  {
    turnToNextPage,
    chapterIndex,
    pagesPerScreen,
    numberOfScreens,
  }: {
    turnToNextPage: (params: { page: Page }) => Promise<void>
    chapterIndex: number
    pagesPerScreen: number
    numberOfScreens: number
  },
) => {
  for (let screen = 1; screen <= numberOfScreens; screen++) {
    await turnToNextPage({ page })
    await expect
      .poll(() => readSettledPagination(page))
      .toMatchObject({
        spineItemIndex: chapterIndex,
        ...getScreenOfPage(screen * pagesPerScreen, pagesPerScreen),
      })
  }
}

/**
 * Each page the reader lists for the spine item shown, with where it is in
 * the item: the position of its top-left corner, from the item's top-left
 * corner. Read once the result has settled on the current layout, so that
 * the pages, the item and the page count describe the same layout.
 */
export const readPagesOfShownSpineItem = async (page: Page) => {
  const reader = await getReader(page)
  const handle = await page.waitForFunction((reader) => {
    const { isSettled, begin } = reader.pagination.state
    const { spineItemIndex } = begin

    if (
      !isSettled ||
      spineItemIndex === undefined ||
      !reader.spine.isLayoutCurrentFor(spineItemIndex)
    ) {
      return undefined
    }

    const itemLayout = reader.spine.getSpineItemSpineLayoutInfo(spineItemIndex)

    return {
      numberOfPages: begin.numberOfPagesInSpineItem,
      pages: reader.spine.pages.value.pages
        .filter(({ itemIndex }) => itemIndex === spineItemIndex)
        .map(({ pageIndex, layout }) => ({
          pageIndex,
          x: layout.left,
          y: layout.top,
        })),
      itemSize: { width: itemLayout.width, height: itemLayout.height },
      pageSize: reader.viewport.value.pageSize,
    }
  }, reader)
  const pagesOfSpineItem = await handle.jsonValue()

  if (!pagesOfSpineItem) throw new Error("no settled pagination result")

  return pagesOfSpineItem
}

/**
 * The node the first page shown starts with, by its cfi, and the page the
 * reader finds it on, read with the settled result that names it.
 */
export const readFirstShownNode = async (page: Page) => {
  const reader = await getReader(page)
  const handle = await page.waitForFunction((reader) => {
    const { isSettled, begin } = reader.pagination.state

    if (!isSettled) return undefined

    const { cfi } = begin

    if (!cfi || reader.cfi.isRootCfi(cfi)) {
      throw new Error(`the first page shown has no node cfi: ${cfi}`)
    }

    const { node, offset, spineItem } = reader.cfi.resolveCfi({ cfi })

    if (!node || !spineItem) throw new Error(`${cfi} names no node`)

    return {
      cfi,
      pageIndex: reader.spine.locator.getSpineItemPageIndexFromNode(
        node,
        offset ?? 0,
        spineItem,
      ),
    }
  }, reader)
  const firstShownNode = await handle.jsonValue()

  if (!firstShownNode) throw new Error("no settled pagination result")

  return firstShownNode
}

/**
 * Puts a spacer before the text of the chapter shown and another after it,
 * two pages long, in the direction its blocks follow. `moveSpaceBeforeText`
 * then moves the text two pages on, while the chapter keeps its number of
 * pages. A transparent border keeps margins from collapsing through either
 * spacer, so moving the space moves nothing else.
 */
export const addSpacersAroundTextOfShownChapter = async (page: Page) =>
  (await getReader(page)).evaluate((reader) => {
    const chapterDocument = reader.spineItemsManager.get(
      reader.pagination.state.begin.spineItemIndex,
    )?.loadedDocument

    if (!chapterDocument) throw new Error("the chapter shown has no document")

    const { body } = chapterDocument
    const pageBlockSize = Number.parseFloat(getComputedStyle(body).blockSize)
    const createSpacer = (id: string, blockSize: number) => {
      const spacer = chapterDocument.createElement("div")

      spacer.id = id
      spacer.style.cssText = `margin: 0; padding: 0; border-block-start: 1px solid transparent; block-size: ${blockSize}px;`

      return spacer
    }

    body.prepend(createSpacer("spacer-before-text", 0))
    body.append(createSpacer("spacer-after-text", 2 * pageBlockSize))
  })

/** Moves the space of the spacer after the text to the spacer before it. */
export const moveSpaceBeforeText = async (page: Page) =>
  (await getReader(page)).evaluate((reader) => {
    const chapterDocument = reader.spineItemsManager.get(
      reader.pagination.state.begin.spineItemIndex,
    )?.loadedDocument
    const spacerBeforeText =
      chapterDocument?.getElementById("spacer-before-text")
    const spacerAfterText = chapterDocument?.getElementById("spacer-after-text")

    if (!spacerBeforeText || !spacerAfterText) {
      throw new Error("the chapter shown has no spacers")
    }

    spacerBeforeText.style.blockSize = spacerAfterText.style.blockSize
    spacerAfterText.style.blockSize = "0px"
  })

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
