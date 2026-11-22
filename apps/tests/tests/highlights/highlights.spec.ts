import { expect, type Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import type {
  Annotation,
  AnnotationsEnhancerAPI,
} from "@prose-reader/enhancer-annotations"
import type { BehaviorSubject } from "rxjs"
import {
  getChapterIndex,
  getNumberOfPagesOfSpineItem,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../utils"
import { waitForSettled } from "../utils/pagination"
import { getReader } from "../utils/reader"
import type { TextDirectionBook } from "../utils/scenarioBooks"
import { test } from "../utils/test"
import { readCfiPositionInWindow } from "../utils/visibility"

type HighlightsReader = Reader & AnnotationsEnhancerAPI

const YELLOW = "rgb(255, 255, 0)"
const RED = "rgb(255, 0, 0)"
const TRANSPARENT = "rgba(0, 0, 0, 0)"

const setAnnotations = (page: Page, annotations: Annotation[]) =>
  page.evaluate((annotations) => {
    // `annotations$` is not in the type of `window`: the scenario's index.tsx
    // sets it.
    ;(
      window as unknown as { annotations$: BehaviorSubject<Annotation[]> }
    ).annotations$.next(annotations)
  }, annotations)

type PositionInParagraph = { paragraphIndex: number; offset: number }

/**
 * An annotation over the text from `start` to `end`, in paragraphs whose
 * first child is text. An offset past the end of that text is its end.
 */
const createAnnotationOverText = async (
  page: Page,
  {
    spineItemIndex,
    start,
    end,
    id,
  }: {
    spineItemIndex: number
    start: PositionInParagraph
    end: PositionInParagraph
    id: string
  },
) =>
  (await getReader<HighlightsReader>(page)).evaluate(
    (reader, { spineItemIndex, start, end, id }): Annotation => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const loadedDocument = spineItem?.loadedDocument

      if (!spineItem || !loadedDocument) {
        throw new Error(`spine item ${spineItemIndex} has no document`)
      }

      const getTextOfParagraph = (paragraphIndex: number) => {
        const text =
          loadedDocument.querySelectorAll("p")[paragraphIndex]?.firstChild

        if (text?.nodeType !== Node.TEXT_NODE) {
          throw new Error(
            `no paragraph ${paragraphIndex} of text in spine item ${spineItemIndex}`,
          )
        }

        return text
      }

      const range = loadedDocument.createRange()
      const startText = getTextOfParagraph(start.paragraphIndex)
      const endText = getTextOfParagraph(end.paragraphIndex)

      range.setStart(
        startText,
        Math.min(start.offset, startText.textContent?.length ?? 0),
      )
      range.setEnd(
        endText,
        Math.min(end.offset, endText.textContent?.length ?? 0),
      )

      return { id, cfi: reader.cfi.generateCfiFromRange(range, spineItem.item) }
    },
    { spineItemIndex, start, end, id },
  )

const createAnnotationOverStartOfParagraph = (
  page: Page,
  {
    spineItemIndex,
    paragraphIndex,
    id,
  }: { spineItemIndex: number; paragraphIndex: number; id: string },
) =>
  createAnnotationOverText(page, {
    spineItemIndex,
    start: { paragraphIndex, offset: 0 },
    end: { paragraphIndex, offset: 40 },
    id,
  })

const locateFirstRectOfHighlight = (page: Page, annotationId: string) =>
  page.locator(`[data-highlight-rect="${annotationId}"]`).first()

const expectFirstRectOfHighlightToCoverStartOf = async (
  page: Page,
  annotation: Annotation,
) => {
  const firstRectOfHighlight = locateFirstRectOfHighlight(page, annotation.id)

  await expect(firstRectOfHighlight).toBeVisible()

  const startOfAnnotation = await readCfiPositionInWindow(page, annotation.cfi)
  const boxOfFirstRect = await firstRectOfHighlight.boundingBox()

  if (typeof startOfAnnotation === "string") throw new Error(startOfAnnotation)

  expect(
    boxOfFirstRect &&
      startOfAnnotation.x > boxOfFirstRect.x - 1 &&
      startOfAnnotation.x < boxOfFirstRect.x + boxOfFirstRect.width &&
      startOfAnnotation.y > boxOfFirstRect.y - 1 &&
      startOfAnnotation.y < boxOfFirstRect.y + boxOfFirstRect.height,
    `whether the first rect of the highlight, at ${JSON.stringify(boxOfFirstRect)}, covers the first character of the annotation, at ${JSON.stringify(startOfAnnotation)}`,
  ).toBe(true)
}

type BoxInWindow = { left: number; top: number; right: number; bottom: number }

type EdgeOfBox = keyof BoxInWindow

/**
 * Where the lines of a book run in the window: across in the ltr book, down in
 * the vertical-rl one.
 */
type LineAxes = {
  across: readonly [EdgeOfBox, EdgeOfBox]
  along: readonly [EdgeOfBox, EdgeOfBox]
  toPoint: (position: { along: number; across: number }) => {
    x: number
    y: number
  }
}

const LINE_AXES_OF_BOOK: Record<"ltr" | "vertical-rl", LineAxes> = {
  ltr: {
    across: ["top", "bottom"],
    along: ["left", "right"],
    toPoint: ({ along, across }) => ({ x: along, y: across }),
  },
  "vertical-rl": {
    across: ["left", "right"],
    along: ["top", "bottom"],
    toPoint: ({ along, across }) => ({ x: across, y: along }),
  },
}

const readBoxesOfHighlight = (page: Page, annotationId: string) =>
  page.evaluate(
    (annotationId) =>
      Array.from(
        document.querySelectorAll(`[data-highlight-rect="${annotationId}"]`),
        (element): BoxInWindow => {
          const { left, top, right, bottom } = element.getBoundingClientRect()

          return { left, top, right, bottom }
        },
      ),
    annotationId,
  )

const doesClickReachHighlightAt = (
  page: Page,
  { x, y }: { x: number; y: number },
) =>
  page.evaluate(
    ({ x, y }) =>
      !!document.elementFromPoint(x, y)?.closest("[data-highlight-rect]"),
    { x, y },
  )

/**
 * The boxes of the text of a paragraph that holds only text, the paragraph's
 * own box, both in the window, and the sizes of the window and of a page.
 */
const readTextOfParagraphInWindow = async (
  page: Page,
  {
    spineItemIndex,
    paragraphIndex,
  }: { spineItemIndex: number; paragraphIndex: number },
) =>
  (await getReader<HighlightsReader>(page)).evaluate(
    (reader, { spineItemIndex, paragraphIndex }) => {
      const loadedDocument =
        reader.spineItemsManager.get(spineItemIndex)?.loadedDocument
      const paragraph = loadedDocument?.querySelectorAll("p")[paragraphIndex]
      const frame = loadedDocument?.defaultView?.frameElement
      const text = paragraph?.firstChild

      if (
        !loadedDocument ||
        !paragraph ||
        !frame ||
        !text ||
        text.nodeType !== Node.TEXT_NODE ||
        paragraph.childNodes.length !== 1
      ) {
        throw new Error(
          `no paragraph ${paragraphIndex} of text only in spine item ${spineItemIndex}`,
        )
      }

      const frameBox = frame.getBoundingClientRect()
      const toWindow = ({ left, top, right, bottom }: DOMRect) => ({
        left: frameBox.left + left,
        top: frameBox.top + top,
        right: frameBox.left + right,
        bottom: frameBox.top + bottom,
      })
      const range = loadedDocument.createRange()

      range.selectNodeContents(text)

      return {
        textBoxes: Array.from(range.getClientRects(), toWindow),
        paragraph: toWindow(paragraph.getBoundingClientRect()),
        window: { width: window.innerWidth, height: window.innerHeight },
        pageSize: reader.viewport.value.pageSize,
      }
    },
    { spineItemIndex, paragraphIndex },
  )

/**
 * The lines of the text of a paragraph in one column, from the boxes of its
 * text. WebKit gives a line in several boxes, split where the source breaks
 * the line, so the boxes that start at one place across the lines make one.
 */
const joinTextBoxesIntoLines = (
  textBoxes: BoxInWindow[],
  { across: [startAcross], along: [startAlong, endAlong] }: LineAxes,
) => {
  const lineByStartAcross = new Map<number, BoxInWindow>()

  for (const textBox of textBoxes) {
    const lineKey = Math.round(textBox[startAcross])
    const line = lineByStartAcross.get(lineKey)
    const joinedLine = { ...textBox }

    if (line) {
      joinedLine[startAlong] = Math.min(line[startAlong], textBox[startAlong])
      joinedLine[endAlong] = Math.max(line[endAlong], textBox[endAlong])
    }

    lineByStartAcross.set(lineKey, joinedLine)
  }

  return Array.from(lineByStartAcross.values())
}

/** The pairs of boxes that overlap by more than a pixel each way. */
const getOverlappingBoxes = (boxes: BoxInWindow[]) =>
  boxes.flatMap((box, index) =>
    boxes
      .slice(index + 1)
      .filter(
        (otherBox) =>
          Math.min(box.right, otherBox.right) -
            Math.max(box.left, otherBox.left) >
            1 &&
          Math.min(box.bottom, otherBox.bottom) -
            Math.max(box.top, otherBox.top) >
            1,
      )
      .map((otherBox) => [box, otherBox]),
  )

/** Opens a book at a chapter, and resolves with its index. */
const openChapter = async (
  page: Page,
  href: string,
  book: TextDirectionBook = "ltr",
) => {
  await page.goto(
    `http://localhost:3333/tests/highlights/index.html?book=${book}`,
  )

  const chapterIndex = await getChapterIndex(page, href)

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSpineItemReady(page, [chapterIndex])
  await waitForSettled(page)

  return chapterIndex
}

test("draws the highlight of an annotation with nothing observing taps, draws it again when it changes, and removes it when it leaves the list", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch01.xhtml")
  const reader = await getReader<HighlightsReader>(page)

  const annotation = await createAnnotationOverStartOfParagraph(page, {
    spineItemIndex: chapterIndex,
    paragraphIndex: 0,
    id: "highlight",
  })
  const annotationMovedToNextParagraph = {
    ...(await createAnnotationOverStartOfParagraph(page, {
      spineItemIndex: chapterIndex,
      paragraphIndex: 1,
      id: annotation.id,
    })),
    highlightColor: RED,
    notes: "a note",
  }
  const annotationAtRootOfChapter = await reader.evaluate(
    (reader, { spineItemIndex, id }): Annotation => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)

      if (!spineItem) throw new Error(`no spine item ${spineItemIndex}`)

      return { id, cfi: reader.cfi.generateRootCfi(spineItem.item) }
    },
    { spineItemIndex: chapterIndex, id: annotation.id },
  )

  expect(
    await reader.evaluate(
      (reader, cfis) =>
        cfis.map((cfi) => reader.cfi.resolveCfi({ cfi }).isCfiRange ?? false),
      [annotation.cfi, annotationAtRootOfChapter.cfi],
    ),
    "whether the cfi of the annotation, then the root cfi of the chapter, is a range",
  ).toEqual([true, false])

  const chapterDocument = await reader.evaluateHandle(
    (reader, spineItemIndex) =>
      reader.spineItemsManager.get(spineItemIndex)?.loadedDocument,
    chapterIndex,
  )
  const firstRectOfHighlight = locateFirstRectOfHighlight(page, annotation.id)

  await setAnnotations(page, [annotation])

  await expectFirstRectOfHighlightToCoverStartOf(page, annotation)
  await expect(firstRectOfHighlight.locator("div").first()).toHaveCSS(
    "background-color",
    YELLOW,
  )

  await setAnnotations(page, [annotationMovedToNextParagraph])

  await expect(firstRectOfHighlight.locator("div").first()).toHaveCSS(
    "background-color",
    RED,
  )
  await expect(firstRectOfHighlight).toContainText("📝")
  await expectFirstRectOfHighlightToCoverStartOf(
    page,
    annotationMovedToNextParagraph,
  )

  await setAnnotations(page, [annotationAtRootOfChapter])

  await expect(
    page.locator(`[data-highlight-rect="${annotation.id}"]`),
  ).toHaveCount(0)
  await expect(
    page.locator(`[data-highlight-container="${annotation.id}"]`),
  ).toHaveCount(1)

  await setAnnotations(page, [])

  await expect(page.locator("[data-highlight-container]")).toHaveCount(0)
  expect(
    await reader.evaluate(
      (reader, { spineItemIndex, chapterDocument }) =>
        reader.spineItemsManager.get(spineItemIndex)?.loadedDocument ===
        chapterDocument,
      { spineItemIndex: chapterIndex, chapterDocument },
    ),
    "whether the chapter kept the document it had before the annotations changed",
  ).toBe(true)
})

test("draws a red dashed border on the first selected annotation of the list only", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch01.xhtml")
  const firstAnnotation = await createAnnotationOverStartOfParagraph(page, {
    spineItemIndex: chapterIndex,
    paragraphIndex: 0,
    id: "first",
  })
  const secondAnnotation = await createAnnotationOverStartOfParagraph(page, {
    spineItemIndex: chapterIndex,
    paragraphIndex: 1,
    id: "second",
  })
  const firstRectOfFirstHighlight = locateFirstRectOfHighlight(page, "first")
  const firstRectOfSecondHighlight = locateFirstRectOfHighlight(page, "second")

  await setAnnotations(page, [
    { ...firstAnnotation, selected: true },
    { ...secondAnnotation, selected: true },
  ])

  await expect(firstRectOfFirstHighlight).toHaveCSS("border-top-color", RED)
  await expect(firstRectOfFirstHighlight).toHaveCSS(
    "border-top-style",
    "dashed",
  )
  await expect(firstRectOfSecondHighlight).toHaveCSS(
    "border-top-color",
    TRANSPARENT,
  )

  await setAnnotations(page, [
    firstAnnotation,
    { ...secondAnnotation, selected: true },
  ])

  await expect(firstRectOfSecondHighlight).toHaveCSS("border-top-color", RED)
  await expect(firstRectOfFirstHighlight).toHaveCSS(
    "border-top-color",
    TRANSPARENT,
  )

  await setAnnotations(page, [firstAnnotation, secondAnnotation])

  await expect(firstRectOfSecondHighlight).toHaveCSS(
    "border-top-color",
    TRANSPARENT,
  )
})

test("reports the annotation of the highlight the user clicks through highlightTap$", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch01.xhtml")
  const reader = await getReader<HighlightsReader>(page)
  const annotation = await createAnnotationOverStartOfParagraph(page, {
    spineItemIndex: chapterIndex,
    paragraphIndex: 0,
    id: "highlight",
  })

  await setAnnotations(page, [annotation])
  await expectFirstRectOfHighlightToCoverStartOf(page, annotation)

  await reader.evaluate((reader) => {
    const tappedAnnotationIds: string[] = []

    reader.annotations.highlightTap$.subscribe(({ annotation }) => {
      tappedAnnotationIds.push(annotation.id)
    })
    // `tappedAnnotationIds` is not in the type of `window`: this test keeps
    // there what it records in the page.
    ;(
      window as unknown as { tappedAnnotationIds: string[] }
    ).tappedAnnotationIds = tappedAnnotationIds
  })

  await locateFirstRectOfHighlight(page, annotation.id).click()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { tappedAnnotationIds: string[] })
            .tappedAnnotationIds,
      ),
    )
    .toEqual([annotation.id])
})

for (const book of ["ltr", "vertical-rl"] as const) {
  test(`paints each line of the text of a highlight over a whole paragraph once, and not the blank space beside its lines, in the ${book} book`, async ({
    page,
  }) => {
    const lineAxes = LINE_AXES_OF_BOOK[book]
    const {
      across: [startAcross, endAcross],
      along: [, endAlong],
    } = lineAxes
    const chapterIndex = await openChapter(page, "ch01.xhtml", book)
    const annotation = await createAnnotationOverText(page, {
      spineItemIndex: chapterIndex,
      start: { paragraphIndex: 0, offset: 10 },
      end: { paragraphIndex: 2, offset: 30 },
      id: "highlight",
    })
    const { textBoxes, paragraph, window, pageSize } =
      await readTextOfParagraphInWindow(page, {
        spineItemIndex: chapterIndex,
        paragraphIndex: 1,
      })
    const lines = joinTextBoxesIntoLines(textBoxes, lineAxes)

    expect(
      lines.length,
      "the number of lines of the paragraph that the highlight covers whole",
    ).toBeGreaterThan(1)
    expect(
      paragraph.right - paragraph.left <= pageSize.width &&
        paragraph.bottom - paragraph.top <= pageSize.height,
      `whether the paragraph, at ${JSON.stringify(paragraph)}, fits in a page, ${JSON.stringify(pageSize)}`,
    ).toBe(true)
    expect(
      paragraph.left >= 0 &&
        paragraph.top >= 0 &&
        paragraph.right <= window.width &&
        paragraph.bottom <= window.height,
      `whether the paragraph, at ${JSON.stringify(paragraph)}, is on screen`,
    ).toBe(true)

    await setAnnotations(page, [annotation])
    await expect(locateFirstRectOfHighlight(page, annotation.id)).toBeVisible()

    const boxesOfHighlight = await readBoxesOfHighlight(page, annotation.id)
    const getThickness = (box: BoxInWindow) => box[endAcross] - box[startAcross]
    const thicknessOfLine = Math.max(...lines.map(getThickness))

    expect(
      boxesOfHighlight.filter((box) => getThickness(box) > thicknessOfLine + 1),
      `the boxes of the highlight thicker than a line of text, ${thicknessOfLine}px`,
    ).toEqual([])
    expect(
      getOverlappingBoxes(boxesOfHighlight),
      "the boxes of the highlight that overlap",
    ).toEqual([])

    for (const line of lines) {
      expect(
        await doesClickReachHighlightAt(page, {
          x: (line.left + line.right) / 2,
          y: (line.top + line.bottom) / 2,
        }),
        `whether a click on the text of the line at ${JSON.stringify(line)} reaches the highlight`,
      ).toBe(true)
    }

    const shortestLine = lines.reduce((shortest, line) =>
      line[endAlong] < shortest[endAlong] ? line : shortest,
    )

    expect(
      paragraph[endAlong] - shortestLine[endAlong],
      "the length of the blank space after the shortest line of the paragraph",
    ).toBeGreaterThan(8)
    expect(
      await doesClickReachHighlightAt(
        page,
        lineAxes.toPoint({
          along: (shortestLine[endAlong] + paragraph[endAlong]) / 2,
          across: (shortestLine[startAcross] + shortestLine[endAcross]) / 2,
        }),
      ),
      `whether a click on the blank space after the line at ${JSON.stringify(shortestLine)} reaches the highlight`,
    ).toBe(false)
  })
}

test("paints no box across the gap between two pages of a highlight over several pages", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch01.xhtml")
  const reader = await getReader<HighlightsReader>(page)
  const lastParagraphIndex = await reader.evaluate(
    (reader, spineItemIndex) =>
      (reader.spineItemsManager
        .get(spineItemIndex)
        ?.loadedDocument?.querySelectorAll("p").length ?? 0) - 1,
    chapterIndex,
  )
  const annotation = await createAnnotationOverText(page, {
    spineItemIndex: chapterIndex,
    start: { paragraphIndex: 0, offset: 10 },
    end: {
      paragraphIndex: lastParagraphIndex,
      offset: Number.MAX_SAFE_INTEGER,
    },
    id: "highlight",
  })

  expect(
    await getNumberOfPagesOfSpineItem(page, chapterIndex),
    "the number of pages of the chapter, which the highlight covers from its start to its end",
  ).toBeGreaterThan(1)

  await setAnnotations(page, [annotation])
  await expect(locateFirstRectOfHighlight(page, annotation.id)).toBeVisible()

  const { pageWidth, leftOfSpineItem } = await reader.evaluate(
    (reader, spineItemIndex) => ({
      pageWidth: reader.viewport.value.pageSize.width,
      leftOfSpineItem:
        reader.spineItemsManager
          .get(spineItemIndex)
          ?.containerElement.getBoundingClientRect().left ?? 0,
    }),
    chapterIndex,
  )
  const getPageIndexAt = (x: number) =>
    Math.floor((x - leftOfSpineItem) / pageWidth)

  expect(
    (await readBoxesOfHighlight(page, annotation.id)).filter(
      ({ left, right }) => getPageIndexAt(left) !== getPageIndexAt(right - 1),
    ),
    `the boxes of the highlight that run from one page into another, ${pageWidth}px wide`,
  ).toEqual([])
})

test("paints an image that a highlight covers whole with the boxes of the image", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch04.xhtml")
  const reader = await getReader<HighlightsReader>(page)
  const annotation = await createAnnotationOverText(page, {
    spineItemIndex: chapterIndex,
    start: { paragraphIndex: 5, offset: 10 },
    end: { paragraphIndex: 6, offset: 30 },
    id: "highlight",
  })
  const readImageOfFigure = async () =>
    reader.evaluate(
      async (reader, { spineItemIndex, cfi }) => {
        const loadedDocument =
          reader.spineItemsManager.get(spineItemIndex)?.loadedDocument
        const image = loadedDocument
          ?.querySelector("figure")
          ?.querySelector("img")
        const frame = loadedDocument?.defaultView?.frameElement

        if (!image || !frame) throw new Error("the chapter has no figure")

        await image.decode()

        const frameBox = frame.getBoundingClientRect()

        return {
          isInHighlight: !!reader.cfi
            .resolveCfi({ cfi })
            .range?.intersectsNode(image),
          boxes: Array.from(
            image.getClientRects(),
            ({ left, top, right, bottom }) => ({
              left: frameBox.left + left,
              top: frameBox.top + top,
              right: frameBox.left + right,
              bottom: frameBox.top + bottom,
            }),
          ),
        }
      },
      { spineItemIndex: chapterIndex, cfi: annotation.cfi },
    )

  expect(
    (await readImageOfFigure()).isInHighlight,
    "whether the highlight covers the image of the figure",
  ).toBe(true)

  await setAnnotations(page, [annotation])

  await expect
    .poll(
      async () => {
        const { boxes: boxesOfImage } = await readImageOfFigure()
        const boxesOfHighlight = await readBoxesOfHighlight(page, annotation.id)

        return (
          boxesOfImage.length > 0 &&
          boxesOfImage.every((boxOfImage) =>
            boxesOfHighlight.some((box) =>
              (["left", "top", "right", "bottom"] as const).every(
                (edge) => Math.abs(box[edge] - boxOfImage[edge]) <= 1,
              ),
            ),
          )
        )
      },
      {
        message:
          "whether each box of the image, one for each page that it is on, is a box of the highlight",
      },
    )
    .toBe(true)
})

test("gives a new annotation of a selection the text of the range its cfi resolves to, and not the selection as the browser renders it", async ({
  page,
}) => {
  const chapterIndex = await openChapter(page, "ch01.xhtml")
  const reader = await getReader<HighlightsReader>(page)

  const { firstParagraphEnd, secondParagraphStart, ...texts } =
    await reader.evaluate((reader, spineItemIndex) => {
      const loadedDocument =
        reader.spineItemsManager.get(spineItemIndex)?.loadedDocument
      const [firstText, secondText] = [
        ...(loadedDocument?.querySelectorAll("p") ?? []),
      ].map((paragraph) => paragraph.firstChild)
      const selection = loadedDocument?.getSelection()

      if (
        firstText?.nodeType !== Node.TEXT_NODE ||
        secondText?.nodeType !== Node.TEXT_NODE ||
        !selection
      ) {
        throw new Error(
          `no two paragraphs of text in spine item ${spineItemIndex}`,
        )
      }

      selection.setBaseAndExtent(firstText, 10, secondText, 20)

      const annotation = reader.annotations.createAnnotation({
        itemIndex: spineItemIndex,
        selection,
      })

      return {
        firstParagraphEnd: firstText.textContent?.slice(10) ?? "",
        secondParagraphStart: secondText.textContent?.slice(0, 20) ?? "",
        highlightedText: annotation?.highlightedText,
        textOfRangeAtCfi: reader.cfi
          .resolveCfi({ cfi: annotation?.cfi ?? "" })
          .range?.toString(),
        textOfSelection: selection.toString(),
      }
    }, chapterIndex)

  expect(
    texts.textOfRangeAtCfi?.startsWith(firstParagraphEnd) &&
      texts.textOfRangeAtCfi.endsWith(secondParagraphStart),
    `whether the cfi resolves to the selected text, from the end of the first paragraph to the start of the second: ${JSON.stringify(texts.textOfRangeAtCfi)}`,
  ).toBe(true)
  expect(
    texts.textOfSelection,
    "the selection as the browser renders it, which differs from the text of its range",
  ).not.toBe(texts.textOfRangeAtCfi)
  expect(texts.highlightedText).toBe(texts.textOfRangeAtCfi)
})
