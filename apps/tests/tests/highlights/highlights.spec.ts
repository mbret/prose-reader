import { expect, type Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import type {
  Annotation,
  AnnotationsEnhancerAPI,
} from "@prose-reader/enhancer-annotations"
import type { BehaviorSubject } from "rxjs"
import {
  getChapterIndex,
  navigateToSpineItem,
  waitForSpineItemReady,
} from "../utils"
import { waitForSettled } from "../utils/pagination"
import { getReader } from "../utils/reader"
import { test } from "../utils/test"
import { readCfiPositionInWindow } from "../utils/visibility"

type HighlightsReader = Reader & AnnotationsEnhancerAPI

const YELLOW = "rgb(255, 255, 0)"
const RED = "rgb(255, 0, 0)"

/** Gives the reader a new list of annotations, as an app does. */
const setAnnotations = (page: Page, annotations: Annotation[]) =>
  page.evaluate((annotations) => {
    // The page's window is untyped: the scenario's index.tsx sets the
    // annotations it gives the reader.
    ;(
      window as unknown as { annotations$: BehaviorSubject<Annotation[]> }
    ).annotations$.next(annotations)
  }, annotations)

/**
 * An annotation over the first characters of a paragraph of a spine item
 * whose document is loaded.
 */
const createAnnotationOverStartOfParagraph = async (
  page: Page,
  {
    spineItemIndex,
    paragraphIndex,
    id,
  }: { spineItemIndex: number; paragraphIndex: number; id: string },
) =>
  (await getReader<HighlightsReader>(page)).evaluate(
    (reader, { spineItemIndex, paragraphIndex, id }): Annotation => {
      const spineItem = reader.spineItemsManager.get(spineItemIndex)
      const loadedDocument = spineItem?.loadedDocument
      const text =
        loadedDocument?.querySelectorAll("p")[paragraphIndex]?.firstChild

      if (!spineItem || !loadedDocument || text?.nodeType !== Node.TEXT_NODE) {
        throw new Error(
          `no paragraph ${paragraphIndex} of text in spine item ${spineItemIndex}`,
        )
      }

      const range = loadedDocument.createRange()

      range.setStart(text, 0)
      range.setEnd(text, Math.min(40, text.textContent?.length ?? 0))

      return { id, cfi: reader.cfi.generateCfiFromRange(range, spineItem.item) }
    },
    { spineItemIndex, paragraphIndex, id },
  )

/**
 * Expects the first rect of the highlight of an annotation to cover the first
 * character the annotation's cfi points to, where the page shows it.
 */
const expectFirstRectOfHighlightToCoverStartOf = async (
  page: Page,
  annotation: Annotation,
) => {
  const firstRectOfHighlight = page
    .locator(`[data-highlight-rect="${annotation.id}"]`)
    .first()

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

test("draws the highlight of an annotation with nothing observing taps, draws it again as it changes, and removes it once it leaves the list", async ({
  page,
}) => {
  await page.goto("http://localhost:3333/tests/highlights/index.html")

  const reader = await getReader<HighlightsReader>(page)
  const chapterIndex = await getChapterIndex(page, "ch01.xhtml")

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSpineItemReady(page, [chapterIndex])
  await waitForSettled(page)

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

  expect(
    await reader.evaluate(
      (reader, cfi) => reader.cfi.resolveCfi({ cfi }).isCfiRange,
      annotation.cfi,
    ),
    "whether the cfi of the annotation is a range",
  ).toBe(true)

  const chapterDocument = await reader.evaluateHandle(
    (reader, spineItemIndex) =>
      reader.spineItemsManager.get(spineItemIndex)?.loadedDocument,
    chapterIndex,
  )
  const firstRectOfHighlight = page
    .locator(`[data-highlight-rect="${annotation.id}"]`)
    .first()

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
