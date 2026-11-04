import { expect, type Page, test } from "@playwright/test"
import { navigateToSpineItem } from "../../../utils"
import { layOutAndRestore, waitForSettled } from "../../../utils/pagination"
import { getReader } from "../../../utils/reader"
import { isCfiPositionVisible } from "../../../utils/visibility"
import { getLongChapterIndex, readPosition } from "./position"

/**
 * After a layout, the reader restores the current navigation to the page that
 * holds its anchor now. A layout can move a reflowable chapter's text to
 * another page and keep the chapter's size, so the page index the navigation
 * was on does not tell where its anchor is.
 */

const url = "http://localhost:3333/tests/navigation/restoration/epub/index.html"

/**
 * A smaller font scale or page margin moves text to earlier pages and can keep
 * the chapter's number of pages, and so its size. Which step keeps the number
 * of pages differs per browser, so each case runs three small steps.
 */
const smallerSettings = [
  {
    setting: "font scale",
    steps: [{ fontScale: 0.99 }, { fontScale: 0.98 }, { fontScale: 0.97 }],
  },
  {
    setting: "page margin",
    steps: [
      { pageHorizontalMargin: 23 },
      { pageHorizontalMargin: 22 },
      { pageHorizontalMargin: 21 },
    ],
  },
]

/** Turns to the eleventh page of a chapter. */
const turnTenPages = async (page: Page, chapterIndex: number) => {
  const reader = await getReader(page)

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSettled(page)

  for (let turn = 0; turn < 10; turn++) {
    await reader.evaluate((reader) => {
      reader.navigation.turnRight()
    })
    await waitForSettled(page)
  }
}

/** Ways to reach a page after a chapter's first, each with its own anchor. */
const ways = [
  {
    // The first character of the page.
    way: "turning pages",
    reach: turnTenPages,
  },
  {
    /**
     * The element the url's fragment names. It holds the page's first
     * character, so that any text that moves to an earlier page takes it
     * along.
     */
    way: "a url to an element",
    reach: async (page: Page, chapterIndex: number) => {
      await turnTenPages(page, chapterIndex)

      const reader = await getReader(page)
      const { readingPosition } = await readPosition(page)

      if (!readingPosition) throw new Error("the reader has no position")

      await reader.evaluate(
        (reader, { cfi, chapterIndex }) => {
          const { node, offset } = reader.cfi.resolveCfi({ cfi })
          const href = reader.context.manifest.spineItems[chapterIndex]?.href

          if (!node?.ownerDocument || !href)
            throw new Error("the reading position names nothing")

          const range = node.ownerDocument.createRange()
          const element = node.ownerDocument.createElement("span")

          range.setStart(node, offset ?? 0)
          range.setEnd(node, (offset ?? 0) + 1)
          element.id = "page-start"
          range.surroundContents(element)
          reader.navigation.goToUrl(`${href}#page-start`)
        },
        { cfi: readingPosition, chapterIndex },
      )
      await waitForSettled(page)

      const { readingPosition: urlReadingPosition } = await readPosition(page)

      if (!urlReadingPosition) throw new Error("the url gave no position")

      expect(
        await reader.evaluate((reader, cfi) => {
          const { node } = reader.cfi.resolveCfi({ cfi })

          return node && "id" in node ? node.id : undefined
        }, urlReadingPosition),
        "the element the reading position names",
      ).toBe("page-start")
    },
  },
]

test.describe("Given a page after a chapter's first", () => {
  for (const { way, reach } of ways) {
    for (const { setting, steps } of smallerSettings) {
      test(`reached by ${way}, it stays on screen as a smaller ${setting} moves the text`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 536, height: 842 })
        await page.goto(url)
        await waitForSettled(page)

        const chapterIndex = await getLongChapterIndex(page)

        await reach(page, chapterIndex)
        await expect
          .poll(() =>
            readPosition(page).then(
              ({ readingPositionStatus }) => readingPositionStatus,
            ),
          )
          .toBe("success")

        const position = await readPosition(page)
        const { readingPosition } = position

        if (!readingPosition) throw new Error("the reader has no position")

        expect(position.spineItemIndex).toBe(chapterIndex)
        expect(position.pageIndex).toBeGreaterThan(0)
        expect(await isCfiPositionVisible(page, readingPosition)).toBe(true)

        let { numberOfPages, pageIndex } = position
        let stepsThatMovedTheAnchorOnly = 0

        for (const settings of steps) {
          await layOutAndRestore(page, { settings })

          expect(
            await isCfiPositionVisible(page, readingPosition),
            `the reading position after ${JSON.stringify(settings)}`,
          ).toBe(true)

          const afterStep = await readPosition(page)

          expect(afterStep.readingPosition).toBe(readingPosition)

          if (
            afterStep.numberOfPages === numberOfPages &&
            afterStep.pageIndex !== pageIndex
          ) {
            stepsThatMovedTheAnchorOnly++
          }

          numberOfPages = afterStep.numberOfPages
          pageIndex = afterStep.pageIndex
        }

        // Only a step that moves the anchor to another page and keeps the
        // chapter's number of pages tests this case. One that changes the
        // number of pages changes the chapter's size, and the reader resolves
        // any anchor after a size change.
        expect(
          stepsThatMovedTheAnchorOnly,
          "the steps that moved the anchor to another page and kept the chapter's number of pages",
        ).toBeGreaterThan(0)
      })
    }
  }
})

test.describe("Given a layout that changes nothing", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 690, height: 1294 })
    await page.goto(url)
    await waitForSettled(page)
  })

  /**
   * Restoration resolves an anchor in text after every layout. A page turn
   * anchors the first character of the page it lands on, so a layout that
   * changes nothing must find that character on the same page, for each page
   * of the chapter.
   */
  test("each page of a chapter turned to stays", async ({ page }) => {
    const chapterIndex = await getLongChapterIndex(page)
    const reader = await getReader(page)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)

    const { numberOfPages } = await readPosition(page)

    expect(numberOfPages).toBeGreaterThan(2)

    for (let pageIndex = 1; pageIndex < numberOfPages; pageIndex++) {
      await reader.evaluate((reader) => {
        reader.navigation.turnRight()
      })
      await waitForSettled(page)

      const turned = await readPosition(page)

      expect(turned).toMatchObject({ spineItemIndex: chapterIndex, pageIndex })
      expect(turned.isRootCfi).toBe(false)

      await layOutAndRestore(page)

      expect(
        await readPosition(page),
        `page ${pageIndex} once laid out again`,
      ).toMatchObject({
        spineItemIndex: chapterIndex,
        pageIndex,
        readingPosition: turned.cfi,
      })
    }
  })

  /**
   * A page that shows no text is anchored at the element it starts with. An
   * element without text, taller than a page, goes on from the page before,
   * and resolving it again would take the reader back there.
   */
  test("a page anchored at an element that starts on the page before stays", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)
    const reader = await getReader(page)

    await navigateToSpineItem({ page, index: chapterIndex })
    await waitForSettled(page)

    const { numberOfPages } = await readPosition(page)

    await reader.evaluate((reader, chapterIndex) => {
      const document =
        reader.spineItemsManager.get(chapterIndex)?.loadedDocument

      if (!document) throw new Error("the chapter is not loaded")

      const block = document.createElement("div")

      block.style.height = "150vh"
      document.body.append(block)
    }, chapterIndex)
    await layOutAndRestore(page)

    const lastPageIndex = (await readPosition(page)).numberOfPages - 1

    expect(lastPageIndex).toBeGreaterThanOrEqual(numberOfPages)

    await reader.evaluate(
      (reader, { chapterIndex, lastPageIndex }) => {
        reader.navigation.goToPageOfSpineItem({
          spineItemId: chapterIndex,
          pageIndex: lastPageIndex,
        })
      },
      { chapterIndex, lastPageIndex },
    )
    await waitForSettled(page)

    const lastPage = await readPosition(page)
    const { readingPosition } = lastPage

    if (!readingPosition) throw new Error("the reader has no position")

    expect(lastPage).toMatchObject({
      spineItemIndex: chapterIndex,
      pageIndex: lastPageIndex,
      readingPositionStatus: "success",
    })
    const anchor = await reader.evaluate(
      (reader, { cfi, chapterIndex }) => {
        const { node } = reader.cfi.resolveCfi({ cfi })

        return {
          isElement: node?.nodeType === Node.ELEMENT_NODE,
          startPageIndex: node
            ? reader.spine.locator.getSpineItemPageIndexFromNode(
                node,
                0,
                chapterIndex,
              )
            : undefined,
        }
      },
      { cfi: readingPosition, chapterIndex },
    )

    expect(anchor.isElement, "the last page's anchor is an element").toBe(true)
    expect(anchor.startPageIndex).toBeLessThan(lastPageIndex)

    await layOutAndRestore(page)

    expect(await readPosition(page)).toMatchObject({
      spineItemIndex: chapterIndex,
      pageIndex: lastPageIndex,
      readingPosition,
    })
  })
})
