import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import {
  navigateToSpineItem,
  updateSettings,
  waitForSpineItemReady,
} from "../../utils"
import { isCfiPositionVisible } from "../../utils/visibility"

/**
 * `accessible_epub_3`, whose second chapter (`ch02.xhtml`) runs for many
 * screens. The scenario reads the book with the knobs a spec passes.
 */
const scenario =
  "http://localhost:3333/tests/navigation/restoration/epub/index.html"
const longChapterIndex = 11

// Portrait, so no configuration shows a spread.
const viewportSize = { width: 536, height: 842 }

const waysToScroll = [
  {
    way: "a book that declares `rendition:flow` `scrolled-continuous`",
    query: "renditionFlow=scrolled-continuous",
  },
  {
    way: "a paginated book the app reads by scrolling",
    query: "pageTurnMode=scrollable",
  },
]

/** How the chapter's frame is laid out, against the page it is read in. */
const getLongChapterLayout = (page: Page) =>
  page.evaluate((index) => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader
    const spineItem = reader.spineItemsManager.get(index)
    const frame = spineItem?.renderer.getDocumentFrame()
    const document = frame?.contentDocument

    if (!spineItem || !frame || !document?.scrollingElement)
      throw new Error("the long chapter has no loaded document")

    const { width, height } = frame.getBoundingClientRect()

    return {
      frameWidth: width,
      frameHeight: height,
      documentHeight: document.scrollingElement.scrollHeight,
      pageWidth: reader.viewport.pageSize.width,
      pageHeight: reader.viewport.pageSize.height,
      numberOfPages: spineItem.numberOfPages,
    }
  }, longChapterIndex)

/** The chapter's last paragraph, which only one column several screens tall holds far down. */
const getLastParagraphOfLongChapter = (page: Page) =>
  page.evaluate((index) => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader
    const spineItem = reader.spineItemsManager.get(index)
    const frame = spineItem?.renderer.getDocumentFrame()
    const paragraphs = frame?.contentDocument?.querySelectorAll("p")
    const lastParagraph = paragraphs?.item(paragraphs.length - 1)
    const text = Array.from(lastParagraph?.childNodes ?? []).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    )

    if (!spineItem || !frame || !lastParagraph || !text)
      throw new Error("the long chapter has no last paragraph with text")

    const cfi = reader.cfi.generateCfiForSpineItemPage({
      spineItem: spineItem.item,
      pageNode: { node: text, offset: 0 },
    })

    return {
      cfi,
      isRootCfi: reader.cfi.isRootCfi(cfi),
      // Down the chapter, in the frame's document.
      top: lastParagraph.getBoundingClientRect().top,
    }
  }, longChapterIndex)

/** Scrolls the reader by the given distance, as a user does. */
const scrollBy = (page: Page, distance: number) =>
  page.evaluate((distance) => {
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    const reader = window.reader as Reader
    const scroller = reader.navigation.scrollNavigationController.value.element

    if (!scroller) throw new Error("the reader does not scroll")

    scroller.scrollTop += distance
  }, distance)

/**
 * Only the chapter at the position loads. The chapters before it keep their
 * placeholder size, so it does not move once it is ready: a chapter loading
 * above would push it down.
 */
const openLongChapter = async (page: Page, query: string) => {
  await page.setViewportSize(viewportSize)
  await page.goto(`${scenario}?preload=0&${query}`)
  await page.waitForFunction(
    // @ts-expect-error window.reader is set by the scenario's index.tsx
    () => !!window.reader,
  )
  await navigateToSpineItem({ page, index: longChapterIndex })
  await waitForSpineItemReady(page, [longChapterIndex])
}

for (const { way, query } of waysToScroll) {
  test.describe(`Given ${way}`, () => {
    test("Then a chapter is one column as tall as its content", async ({
      page,
    }) => {
      await openLongChapter(page, query)

      const layout = await getLongChapterLayout(page)

      expect(layout.frameWidth).toBe(layout.pageWidth)
      expect(layout.frameHeight).toBe(layout.documentHeight)
      expect(layout.frameHeight).toBeGreaterThan(layout.pageHeight * 5)
    })

    test("Then scrolling reaches the end of a chapter", async ({ page }) => {
      await openLongChapter(page, query)

      const { cfi, isRootCfi, top } = await getLastParagraphOfLongChapter(page)

      expect(isRootCfi).toBe(false)
      expect(await isCfiPositionVisible(page, cfi)).toBe(false)

      // To the middle of the screen, clear of its edges and of subpixels.
      await scrollBy(page, top - viewportSize.height / 2)

      await expect.poll(() => isCfiPositionVisible(page, cfi)).toBe(true)
    })

    test("Then a navigation to a place far down a loaded chapter shows it", async ({
      page,
    }) => {
      await openLongChapter(page, query)

      const { cfi, isRootCfi } = await getLastParagraphOfLongChapter(page)

      expect(isRootCfi).toBe(false)
      expect(await isCfiPositionVisible(page, cfi)).toBe(false)

      await page.evaluate((cfi) => {
        // @ts-expect-error window.reader is set by the scenario's index.tsx
        const reader = window.reader as Reader

        reader.navigation.goToCfi(cfi, { animate: false })
      }, cfi)

      await expect.poll(() => isCfiPositionVisible(page, cfi)).toBe(true)
    })
  })
}

test.describe("Given a paginated book with a chapter loaded", () => {
  test("When scrolling is turned on and off, then the chapter becomes one column and paginated again", async ({
    page,
  }) => {
    await openLongChapter(page, "")

    const paginated = await getLongChapterLayout(page)

    expect(paginated.frameHeight).toBe(paginated.pageHeight)
    expect(paginated.numberOfPages).toBeGreaterThan(5)

    await updateSettings({ page, settings: { pageTurnMode: "scrollable" } })

    await expect
      .poll(async () => {
        const { frameWidth, frameHeight, documentHeight, pageWidth } =
          await getLongChapterLayout(page)

        return frameWidth === pageWidth && frameHeight === documentHeight
      })
      .toBe(true)
    expect((await getLongChapterLayout(page)).frameHeight).toBeGreaterThan(
      paginated.pageHeight * 5,
    )

    await updateSettings({ page, settings: { pageTurnMode: "controlled" } })

    await expect
      .poll(async () => {
        const { frameHeight, numberOfPages } = await getLongChapterLayout(page)

        return { frameHeight, numberOfPages }
      })
      .toEqual({
        frameHeight: paginated.pageHeight,
        numberOfPages: paginated.numberOfPages,
      })
  })
})
