import { expect, type JSHandle, type Page } from "@playwright/test"
import type { Reader } from "@prose-reader/core"
import type {
  Annotation,
  AnnotationsEnhancerAPI,
} from "@prose-reader/enhancer-annotations"
import type { BehaviorSubject } from "rxjs"
import {
  getLongChapterIndex,
  navigateToSpineItem,
  waitForSpineItemReady,
  waitForSpineItemUnloaded,
} from "../utils"
import { waitForSettled } from "../utils/pagination"
import { getReader } from "../utils/reader"
import { test } from "../utils/test"

type HighlightsReader = Reader & AnnotationsEnhancerAPI

/**
 * The page's window, as the scenario's `index.tsx` fills it. The page
 * functions cast to it, since the window's own type knows none of it.
 */
type ScenarioWindow = {
  annotations$: BehaviorSubject<Annotation[]>
}

const RED = "rgb(255, 0, 0)"
const BLUE = "rgb(0, 0, 255)"

/** Opens the scenario on `ch02.xhtml`, a chapter of many paragraphs. */
const openLongChapter = async (page: Page) => {
  await page.goto("http://localhost:3333/tests/annotations/index.html")

  const chapterIndex = await getLongChapterIndex(page)

  await navigateToSpineItem({ page, index: chapterIndex })
  await waitForSettled(page)
  await waitForSpineItemReady(page, [chapterIndex])

  return {
    reader: await getReader<HighlightsReader>(page),
    chapterIndex,
  }
}

/**
 * Range cfis over the start of the first `count` paragraphs of the chapter,
 * one per paragraph.
 */
const createRangeCfisOfParagraphs = (
  reader: JSHandle<HighlightsReader>,
  { chapterIndex, count }: { chapterIndex: number; count: number },
) =>
  reader.evaluate(
    (reader, { chapterIndex, count }) => {
      const spineItem = reader.spineItemsManager.get(chapterIndex)
      const chapterDocument =
        spineItem?.renderer.getDocumentFrame()?.contentDocument

      if (!spineItem || !chapterDocument) {
        throw new Error("the chapter has no loaded document")
      }

      const paragraphTexts = Array.from(
        chapterDocument.querySelectorAll("p"),
        (paragraph) => paragraph.firstChild,
      )
        .filter(
          (node): node is ChildNode =>
            node?.nodeType === Node.TEXT_NODE &&
            (node.textContent?.trim().length ?? 0) > 40,
        )
        .slice(0, count)

      if (paragraphTexts.length < count) {
        throw new Error(`the chapter has fewer than ${count} paragraphs`)
      }

      return paragraphTexts.map((text) => {
        const range = chapterDocument.createRange()

        range.setStart(text, 0)
        range.setEnd(text, 20)

        const cfi = reader.cfi.generateCfiFromRange(range, spineItem.item)

        if (!reader.cfi.resolveCfi({ cfi })?.isCfiRange) {
          throw new Error(`${cfi} is not a range cfi`)
        }

        return cfi
      })
    },
    { chapterIndex, count },
  )

const setAnnotations = (page: Page, annotations: Annotation[]) =>
  page.evaluate((annotations) => {
    ;(window as unknown as ScenarioWindow).annotations$.next(annotations)
  }, annotations)

/**
 * How far, in pixels, the box drawn for an annotation is from the box of the
 * text its cfi covers, at the edge where they are the furthest apart, as the
 * page renders them. Infinity when nothing is drawn for it.
 */
const readHighlightDistanceFromText = (
  reader: JSHandle<HighlightsReader>,
  { annotationId, cfi }: { annotationId: string; cfi: string },
) =>
  reader.evaluate(
    (reader, { annotationId, cfi }) => {
      const highlightBoxes = Array.from(
        document.querySelectorAll(`[data-highlight-rect="${annotationId}"]`),
        (element) => element.getBoundingClientRect(),
      )

      if (!highlightBoxes.length) return Number.POSITIVE_INFINITY

      const resolved = reader.cfi.resolveCfi({ cfi })

      if (!resolved?.isCfiRange || !resolved.range) {
        throw new Error(`${cfi} does not resolve to a range`)
      }

      const frame = reader.spineItemsManager
        .get(resolved.itemIndex)
        ?.renderer.getDocumentFrame()

      if (!frame) throw new Error("the chapter has no frame")

      const frameBox = frame.getBoundingClientRect()
      const textBox = resolved.range.getBoundingClientRect()

      const highlightEdges = {
        top: Math.min(...highlightBoxes.map((box) => box.top)),
        right: Math.max(...highlightBoxes.map((box) => box.right)),
        bottom: Math.max(...highlightBoxes.map((box) => box.bottom)),
        left: Math.min(...highlightBoxes.map((box) => box.left)),
      }
      const textEdges = {
        top: frameBox.top + textBox.top,
        right: frameBox.left + textBox.right,
        bottom: frameBox.top + textBox.bottom,
        left: frameBox.left + textBox.left,
      }

      return Math.max(
        Math.abs(highlightEdges.top - textEdges.top),
        Math.abs(highlightEdges.right - textEdges.right),
        Math.abs(highlightEdges.bottom - textEdges.bottom),
        Math.abs(highlightEdges.left - textEdges.left),
      )
    },
    { annotationId, cfi },
  )

const expectHighlightOverText = (
  reader: JSHandle<HighlightsReader>,
  highlight: { annotationId: string; cfi: string },
) =>
  expect
    .poll(() => readHighlightDistanceFromText(reader, highlight), {
      message: `the highlight of ${highlight.annotationId} is drawn over the text of ${highlight.cfi}`,
    })
    .toBeLessThan(1)

const locateHighlightColor = (page: Page, annotationId: string) =>
  page.locator(`[data-highlight-rect="${annotationId}"] > div`).first()

test.describe("Given annotations with a range cfi in a displayed chapter", () => {
  test("should draw each one over its text, in its color", async ({ page }) => {
    const { reader, chapterIndex } = await openLongChapter(page)
    const [firstCfi, secondCfi] = await createRangeCfisOfParagraphs(reader, {
      chapterIndex,
      count: 2,
    })

    if (!firstCfi || !secondCfi) throw new Error("no cfi for the paragraphs")

    await setAnnotations(page, [
      { id: "first", cfi: firstCfi, highlightColor: "red" },
      { id: "second", cfi: secondCfi, highlightColor: "blue" },
    ])

    await expectHighlightOverText(reader, {
      annotationId: "first",
      cfi: firstCfi,
    })
    await expectHighlightOverText(reader, {
      annotationId: "second",
      cfi: secondCfi,
    })
    await expect(locateHighlightColor(page, "first")).toHaveCSS(
      "background-color",
      RED,
    )
    await expect(locateHighlightColor(page, "second")).toHaveCSS(
      "background-color",
      BLUE,
    )
  })

  test.describe("when one leaves the list", () => {
    test("should remove its highlight, and keep the other, without reloading the chapter", async ({
      page,
    }) => {
      const { reader, chapterIndex } = await openLongChapter(page)
      const [firstCfi, secondCfi] = await createRangeCfisOfParagraphs(reader, {
        chapterIndex,
        count: 2,
      })

      if (!firstCfi || !secondCfi) throw new Error("no cfi for the paragraphs")

      const second = { id: "second", cfi: secondCfi, highlightColor: "blue" }

      await setAnnotations(page, [
        { id: "first", cfi: firstCfi, highlightColor: "red" },
        second,
      ])
      await expectHighlightOverText(reader, {
        annotationId: "first",
        cfi: firstCfi,
      })

      const chapterDocument = await reader.evaluateHandle(
        (reader, chapterIndex) =>
          reader.spineItemsManager
            .get(chapterIndex)
            ?.renderer.getDocumentFrame()?.contentDocument,
        chapterIndex,
      )

      await setAnnotations(page, [second])

      await expect(
        page.locator(`[data-highlight-container="first"]`),
      ).toHaveCount(0)
      await expectHighlightOverText(reader, {
        annotationId: "second",
        cfi: secondCfi,
      })
      expect(
        await reader.evaluate(
          (reader, { chapterIndex, chapterDocument }) =>
            reader.spineItemsManager
              .get(chapterIndex)
              ?.renderer.getDocumentFrame()?.contentDocument ===
            chapterDocument,
          { chapterIndex, chapterDocument },
        ),
        "the chapter kept the document it had",
      ).toBe(true)
    })
  })

  test.describe("when its chapter unloads, then loads again", () => {
    test("should draw its highlight over its text again", async ({ page }) => {
      const { reader, chapterIndex } = await openLongChapter(page)
      const [cfi] = await createRangeCfisOfParagraphs(reader, {
        chapterIndex,
        count: 1,
      })

      if (!cfi) throw new Error("no cfi for the paragraph")

      await setAnnotations(page, [{ id: "first", cfi, highlightColor: "red" }])
      await expectHighlightOverText(reader, { annotationId: "first", cfi })

      await navigateToSpineItem({ page, index: 0 })
      await waitForSettled(page)
      await waitForSpineItemUnloaded(page, [chapterIndex])

      await expect(
        page.locator(`[data-highlight-container="first"]`),
      ).toHaveCount(0)

      await navigateToSpineItem({ page, index: chapterIndex })
      await waitForSettled(page)
      await waitForSpineItemReady(page, [chapterIndex])

      await expectHighlightOverText(reader, { annotationId: "first", cfi })
    })
  })

  test.describe("when one changes", () => {
    test("should draw its highlight again in its new color", async ({
      page,
    }) => {
      const { reader, chapterIndex } = await openLongChapter(page)
      const [cfi] = await createRangeCfisOfParagraphs(reader, {
        chapterIndex,
        count: 1,
      })

      if (!cfi) throw new Error("no cfi for the paragraph")

      await setAnnotations(page, [{ id: "first", cfi, highlightColor: "red" }])
      await expect(locateHighlightColor(page, "first")).toHaveCSS(
        "background-color",
        RED,
      )

      await setAnnotations(page, [
        { id: "first", cfi, highlightColor: "blue", notes: "A note" },
      ])

      await expect(locateHighlightColor(page, "first")).toHaveCSS(
        "background-color",
        BLUE,
      )
      await expectHighlightOverText(reader, { annotationId: "first", cfi })
    })

    test("should draw its highlight over the text of its new cfi", async ({
      page,
    }) => {
      const { reader, chapterIndex } = await openLongChapter(page)
      const [firstCfi, secondCfi] = await createRangeCfisOfParagraphs(reader, {
        chapterIndex,
        count: 2,
      })

      if (!firstCfi || !secondCfi) throw new Error("no cfi for the paragraphs")

      await setAnnotations(page, [
        { id: "first", cfi: firstCfi, highlightColor: "red" },
      ])
      await expectHighlightOverText(reader, {
        annotationId: "first",
        cfi: firstCfi,
      })

      await setAnnotations(page, [
        { id: "first", cfi: secondCfi, highlightColor: "red" },
      ])

      await expectHighlightOverText(reader, {
        annotationId: "first",
        cfi: secondCfi,
      })
    })
  })
})
