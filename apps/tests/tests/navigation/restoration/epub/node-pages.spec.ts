import { expect, type Page, test } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import { waitForSettled } from "../../../utils/pagination"
import {
  getChapterIndex,
  getLongChapterIndex,
  goToCfi,
  goToSpineItem,
  initialSize,
  narrowSize,
  readPosition,
  resizeAndExpectAnchorVisible,
  url,
} from "./readingPosition"

/**
 * The first character of a chapter's title, the first line of its first page:
 * its body's first section, the section's heading, the heading's text.
 */
const getChapterTitleCfi = (chapterIndex: number) =>
  `epubcfi(/6/${(chapterIndex + 1) * 2}!/4/2/2/1:0)`

/**
 * Where the character a cfi points to is laid out in its own document, and
 * whether it is text.
 */
const measureCharacterAtCfi = (page: Page, cfi: string) =>
  page.evaluate((cfi) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const { node, offset = 0 } = reader.cfi.resolveCfi({ cfi })

    if (!node?.ownerDocument) return "cfi did not resolve to a node"

    const range = node.ownerDocument.createRange()

    range.setStart(node, offset)
    range.setEnd(node, offset + 1)

    return {
      isText: node.nodeType === Node.TEXT_NODE,
      x: range.getBoundingClientRect().x,
    }
  }, cfi)

/**
 * Without a horizontal margin, a page's first line starts at the page's left
 * edge, and on a chapter's first page that is the left edge of the chapter's
 * document: the first character there measures `x === 0`. So does a node that
 * isn't rendered, with an empty rect, which is placed where the content after
 * it is instead. Telling the two apart is what finds the page holding the
 * first.
 */
test.describe("Given pages without a horizontal margin", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(`${url}?pageHorizontalMargin=0`)
    await waitForSettled(page)
  })

  test("a cfi on the first character of a page, at the left edge of its document, is a success on that page, and a resize restores to it", async ({
    page,
  }) => {
    const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
    const cfi = getChapterTitleCfi(chapterIndex)

    await goToCfi(page, cfi)
    await waitForSettled(page)

    expect(await measureCharacterAtCfi(page, cfi)).toEqual({
      isText: true,
      x: 0,
    })

    /**
     * Once the chapter is laid out, the reader measures the character to find
     * the page holding it, and the reading position is a success on that
     * page.
     *
     * Only a chapter's first page starts at its document's left edge, each
     * next one a page further. That page starts where the chapter does, the
     * progression and the page a reader falls back to without one, so the
     * values below would hold without the page found: its being a success
     * does not.
     */
    await expect
      .poll(
        async () => {
          const { readingPosition, readingPositionStatus } =
            await readPosition(page)

          return { readingPosition, readingPositionStatus }
        },
        { timeout: 10_000 },
      )
      .toEqual({ readingPosition: cfi, readingPositionStatus: "success" })

    const position = await readPosition(page)

    expect(position.spineItemIndex).toBe(chapterIndex)
    expect(position.pageIndex).toBe(0)
    expect(position.readingProgression).toBeCloseTo(
      position.beginPageProgression,
      10,
    )

    await resizeAndExpectAnchorVisible(page, narrowSize, cfi)

    const restored = await readPosition(page)

    expect(restored.spineItemIndex).toBe(chapterIndex)
    expect(restored.pageIndex).toBe(0)
    expect(restored.readingPosition).toBe(cfi)
    expect(restored.readingPositionStatus).toBe("success")
    expect(restored.readingProgression).toBe(position.readingProgression)
  })

  test("a rendered node at the left edge of its document has its page, whatever its size, and one that isn't rendered with nothing after it is on the last page", async ({
    page,
  }) => {
    const chapterIndex = await getChapterIndex(page, "ch03.xhtml")
    const cfi = getChapterTitleCfi(chapterIndex)

    await goToSpineItem(page, chapterIndex)
    await waitForSettled(page)

    expect(await measureCharacterAtCfi(page, cfi)).toEqual({
      isText: true,
      x: 0,
    })

    const pageIndexes = await page.evaluate(
      ({ cfi, chapterIndex }) => {
        // @ts-expect-error window.reader is set by this scenario's index.tsx
        const reader = window.reader as Reader
        const { node: title } = reader.cfi.resolveCfi({ cfi })
        const document = title?.ownerDocument

        if (!title || !document) throw new Error("the title is not loaded")

        const getPageIndex = (node: Node) =>
          reader.spine.locator.getSpineItemPageIndexFromNode(
            node,
            0,
            chapterIndex,
          ) ?? "none"
        const titlePageIndex = getPageIndex(title)

        /**
         * What isn't rendered, of each kind the reader measures: text, from
         * the offset on, and an element without text, such as an image, as a
         * whole. At the end of the chapter, nothing rendered comes after it.
         */
        const hidden = document.createElement("div")
        const hiddenText = document.createTextNode("Hidden")
        const hiddenImage = document.createElement("img")
        const hiddenEmptyElement = document.createElement("span")

        hidden.style.display = "none"
        hidden.append(hiddenText, hiddenImage, hiddenEmptyElement)
        document.body.append(hidden)

        // Rendered, without a size, before the title's first character.
        const renderedElementWithoutSize = document.createElement("span")

        renderedElementWithoutSize.style.display = "inline-block"
        renderedElementWithoutSize.style.width = "0"
        renderedElementWithoutSize.style.height = "0"
        title.parentNode?.insertBefore(renderedElementWithoutSize, title)

        const pageIndexes = {
          lastPage:
            (reader.spineItemsManager.get(chapterIndex)?.numberOfPages ?? 0) -
            1,
          title: titlePageIndex,
          hiddenText: getPageIndex(hiddenText),
          hiddenImage: getPageIndex(hiddenImage),
          hiddenEmptyElement: getPageIndex(hiddenEmptyElement),
          renderedElementWithoutSize: getPageIndex(renderedElementWithoutSize),
        }

        hidden.remove()
        renderedElementWithoutSize.remove()

        return pageIndexes
      },
      { cfi, chapterIndex },
    )

    expect(pageIndexes.lastPage).toBeGreaterThan(0)
    expect(pageIndexes).toEqual({
      lastPage: pageIndexes.lastPage,
      title: 0,
      hiddenText: pageIndexes.lastPage,
      hiddenImage: pageIndexes.lastPage,
      hiddenEmptyElement: pageIndexes.lastPage,
      renderedElementWithoutSize: 0,
    })
  })
})

/**
 * Hides a marker right before the first paragraph of a chapter that starts
 * past its first page, as a book hides a page-break marker. Its cfi names a
 * place that isn't rendered, and the paragraph after it is where that place
 * is. Returns both cfis, and the page the paragraph starts on.
 */
const hideMarkerBeforeParagraphPastFirstPage = (
  page: Page,
  chapterIndex: number,
) =>
  page.evaluate((chapterIndex) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const spineItem = reader.spineItemsManager.get(chapterIndex)
    const document = spineItem?.renderer.getDocumentFrame()?.contentDocument

    if (!spineItem || !document) throw new Error("the chapter is not loaded")

    const paragraphText = Array.from(document.querySelectorAll("p"))
      .map((paragraph) => paragraph.firstChild)
      .find(
        (text): text is Text =>
          text?.nodeType === Node.TEXT_NODE &&
          !!text.textContent?.trim() &&
          (reader.spine.locator.getSpineItemPageIndexFromNode(
            text,
            0,
            chapterIndex,
          ) ?? 0) > 0,
      )
    const paragraph = paragraphText?.parentNode

    if (!paragraphText || !paragraph)
      throw new Error("no paragraph starts past the chapter's first page")

    const marker = document.createElement("span")

    marker.style.display = "none"
    paragraph.parentNode?.insertBefore(marker, paragraph)

    const cfiOf = (node: Node) =>
      reader.cfi.generateCfiForSpineItemPage({
        spineItem: spineItem.item,
        pageNode: { node, offset: 0 },
      })

    return {
      markerCfi: cfiOf(marker),
      paragraphCfi: cfiOf(paragraphText),
      paragraphPageIndex: reader.spine.locator.getSpineItemPageIndexFromNode(
        paragraphText,
        0,
        chapterIndex,
      ),
    }
  }, chapterIndex)

test.describe("Given a cfi naming a place that isn't rendered", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  test("the reader goes to the page of the content after it, a success there, and a resize restores to it", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await goToSpineItem(page, chapterIndex)
    await waitForSettled(page)

    const { markerCfi, paragraphCfi, paragraphPageIndex } =
      await hideMarkerBeforeParagraphPastFirstPage(page, chapterIndex)

    expect(paragraphPageIndex).toBeGreaterThan(0)

    await goToCfi(page, markerCfi)
    await waitForSettled(page)

    /**
     * The marker has no page of its own: the place it names is where the
     * paragraph after it starts. The reader goes there, and the reading
     * position is the marker, a success on that page.
     */
    await expect
      .poll(
        async () => {
          const { readingPosition, readingPositionStatus, pageIndex } =
            await readPosition(page)

          return { readingPosition, readingPositionStatus, pageIndex }
        },
        { timeout: 10_000 },
      )
      .toEqual({
        readingPosition: markerCfi,
        readingPositionStatus: "success",
        pageIndex: paragraphPageIndex,
      })

    const position = await readPosition(page)

    expect(position.spineItemIndex).toBe(chapterIndex)
    expect(position.readingProgression).toBeCloseTo(
      position.beginPageProgression,
      10,
    )

    await resizeAndExpectAnchorVisible(page, narrowSize, paragraphCfi)

    const restored = await readPosition(page)

    expect(restored.readingPosition).toBe(markerCfi)
    expect(restored.readingPositionStatus).toBe("success")
  })
})

/**
 * Appends, at the end of a loaded chapter, a video with a source, which lays
 * out no box of its own, then an element without text holding two images:
 * each takes most of a page's height and cannot be split, so each is on a page
 * of its own. The chapter is laid out again for them.
 */
const appendVideoAndGallery = async (page: Page, chapterIndex: number) => {
  const numberOfPagesBefore = await page.evaluate((chapterIndex) => {
    // @ts-expect-error window.reader is set by this scenario's index.tsx
    const reader = window.reader as Reader
    const spineItem = reader.spineItemsManager.get(chapterIndex)
    const document = spineItem?.renderer.getDocumentFrame()?.contentDocument

    if (!spineItem || !document) throw new Error("the chapter is not loaded")

    const pageTall = (element: HTMLElement) => {
      element.style.display = "block"
      element.style.width = "10px"
      element.style.height = "60vh"

      return element
    }
    const image = () => {
      const image = document.createElement("img")

      image.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

      return pageTall(image)
    }
    const video = pageTall(document.createElement("video"))
    const gallery = document.createElement("div")

    video.id = "video"
    video.append(document.createElement("source"))
    gallery.id = "gallery"
    gallery.append(image(), image())
    document.body.append(video, gallery)

    const numberOfPagesBefore = spineItem.numberOfPages

    reader.layout()

    return numberOfPagesBefore
  }, chapterIndex)

  await expect
    .poll(() =>
      page.evaluate(
        (chapterIndex) =>
          // @ts-expect-error window.reader is set by this scenario's index.tsx
          (window.reader as Reader).spineItemsManager.get(chapterIndex)
            ?.numberOfPages,
        chapterIndex,
      ),
    )
    .toBeGreaterThan(numberOfPagesBefore)
  await waitForSettled(page)
}

test.describe("Given an element without text holding content over several pages", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(initialSize)
    await page.goto(url)
    await waitForSettled(page)
  })

  /**
   * A cfi into the empty character data between an element's children, or
   * after its last one, names the boundary there: the element, at a child's
   * index. The element starts where its first child does, and a boundary
   * after its last child is where its contents end.
   */
  test("a place between its children is on the page of the child after it, and one after its last child on the page its contents end", async ({
    page,
  }) => {
    const chapterIndex = await getLongChapterIndex(page)

    await goToSpineItem(page, chapterIndex)
    await waitForSettled(page)
    await appendVideoAndGallery(page, chapterIndex)

    const pageIndexes = await page.evaluate((chapterIndex) => {
      // @ts-expect-error window.reader is set by this scenario's index.tsx
      const reader = window.reader as Reader
      const spineItem = reader.spineItemsManager.get(chapterIndex)
      const document = spineItem?.renderer.getDocumentFrame()?.contentDocument
      const video = document?.getElementById("video")
      const gallery = document?.getElementById("gallery")
      const [firstImage, secondImage] = Array.from(gallery?.children ?? [])

      if (
        !spineItem ||
        !document ||
        !video ||
        !gallery ||
        !firstImage ||
        !secondImage
      )
        throw new Error("the chapter holds no gallery")

      const getPageIndex = (node: Node, offset: number) =>
        reader.spine.locator.getSpineItemPageIndexFromNode(
          node,
          offset,
          chapterIndex,
        )

      /**
       * A paragraph whose text starts on one page and ends on the next, with
       * the pages of its first and last characters.
       */
      const paragraphOverPages = Array.from(document.querySelectorAll("p"))
        .map((paragraph) => {
          const texts = Array.from(paragraph.childNodes).filter(
            (node): node is Text =>
              node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim(),
          )
          const firstText = texts[0]
          const lastText = texts[texts.length - 1]

          return firstText && lastText
            ? {
                paragraph,
                firstCharacter: getPageIndex(firstText, 0),
                lastCharacter: getPageIndex(
                  lastText,
                  (lastText.textContent?.length ?? 1) - 1,
                ),
              }
            : undefined
        })
        .find(
          (candidate) =>
            candidate !== undefined &&
            (candidate.lastCharacter ?? 0) > (candidate.firstCharacter ?? 0),
        )

      if (!paragraphOverPages)
        throw new Error("no paragraph's text goes on to the next page")

      return {
        lastPage: spineItem.numberOfPages - 1,
        video: getPageIndex(video, 0),
        afterVideoSource: getPageIndex(video, video.childNodes.length),
        firstImage: getPageIndex(firstImage, 0),
        secondImage: getPageIndex(secondImage, 0),
        galleryStart: getPageIndex(gallery, 0),
        betweenImages: getPageIndex(gallery, 1),
        afterLastImage: getPageIndex(gallery, 2),
        paragraphLastCharacter: paragraphOverPages.lastCharacter,
        afterParagraphText: getPageIndex(
          paragraphOverPages.paragraph,
          paragraphOverPages.paragraph.childNodes.length,
        ),
      }
    }, chapterIndex)

    // Each on a page of its own, the video's measured by its own box.
    expect(pageIndexes.video).toBeLessThan(pageIndexes.firstImage ?? -1)
    expect(pageIndexes.firstImage).toBeLessThan(pageIndexes.secondImage ?? -1)
    expect(pageIndexes).toEqual({
      ...pageIndexes,
      // Its source lays out no box: the video's own ends it.
      afterVideoSource: pageIndexes.video,
      galleryStart: pageIndexes.firstImage,
      betweenImages: pageIndexes.secondImage,
      afterLastImage: pageIndexes.secondImage,
      afterParagraphText: pageIndexes.paragraphLastCharacter,
    })
  })
})
