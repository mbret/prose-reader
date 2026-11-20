// @vitest-environment jsdom
import { BehaviorSubject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  type AnnotationsReader,
  createAnnotationAtRootOfSpineItem,
  createLayoutHold,
  getSpineItem,
  giveRangesOfFrameOneRect,
  goToSpineItem,
  installAnnotationsReaderTestEnvironment,
  mountAnnotationsReader,
  mountReaderHoldingOneDocument,
  reflowableManifest,
  subscriptions,
  TwoPageTextDocumentRenderer,
  viewport,
} from "../tests/annotationsReader.ts"
import type { Annotation, AnnotationsByItemPage } from "../types.ts"

installAnnotationsReaderTestEnvironment()

/** The ids of the annotations of each page, by spine item, then by page. */
const toAnnotationIds = (annotationsByItemPage: AnnotationsByItemPage) =>
  Object.fromEntries(
    Array.from(annotationsByItemPage, ([itemIndex, annotationsByPage]) => [
      itemIndex,
      Object.fromEntries(
        Array.from(annotationsByPage, ([pageIndex, annotations]) => [
          pageIndex,
          annotations.map(({ id }) => id),
        ]),
      ),
    ]),
  )

/**
 * Records what `annotationsByItemPage$` emits, from one subscription held
 * until the test ends, as an app holds it.
 */
const recordAnnotationsByItemPage = (reader: AnnotationsReader) => {
  const emissions: AnnotationsByItemPage[] = []

  subscriptions.push(
    reader.annotations.annotationsByItemPage$.subscribe(
      (annotationsByItemPage) => {
        emissions.push(annotationsByItemPage)
      },
    ),
  )

  return emissions
}

/** A range of the text of the second item. */
const rangeInSecondItem: Annotation = {
  id: "range",
  cfi: "epubcfi(/6/4!/4/2,/1:0,/1:3)",
}

describe("annotationsByItemPage$", () => {
  it("completes when the reader is destroyed", async () => {
    const { reader } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const annotationsByItemPageSubscription =
      reader.annotations.annotationsByItemPage$.subscribe()

    subscriptions.push(annotationsByItemPageSubscription)
    reader.destroy()

    expect(annotationsByItemPageSubscription.closed).toBe(true)
  })

  it("gives the annotations of each page in the order of the list, ranges and others alike", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const emissions = recordAnnotationsByItemPage(reader)

    annotations$.next([
      createAnnotationAtRootOfSpineItem(reader, 1, "second"),
      createAnnotationAtRootOfSpineItem(reader, 0, "first"),
      rangeInSecondItem,
      createAnnotationAtRootOfSpineItem(reader, 0, "alsoOnFirstPage"),
    ])
    await vi.runAllTimersAsync()

    expect(emissions.map(toAnnotationIds).at(-1)).toEqual({
      0: { 0: ["first", "alsoOnFirstPage"] },
      1: { 0: ["second", "range"] },
    })
  })

  it("emits an annotation that changes, and nothing for a list of equal annotations or for pages that move no annotation", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const annotation = createAnnotationAtRootOfSpineItem(reader, 0, "first")
    let numberOfPublishedPages = 0

    annotations$.next([annotation, rangeInSecondItem])

    const emissions = recordAnnotationsByItemPage(reader)

    await vi.runAllTimersAsync()

    subscriptions.push(
      reader.spine.layout$.subscribe(() => {
        numberOfPublishedPages++
      }),
    )

    // New objects, equal to the ones before.
    annotations$.next([{ ...annotation }, { ...rangeInSecondItem }])
    await vi.runAllTimersAsync()
    reader.layout()
    await vi.runAllTimersAsync()
    annotations$.next([{ ...annotation, notes: "a note" }, rangeInSecondItem])
    await vi.runAllTimersAsync()

    expect({
      numberOfPublishedPages,
      notesByEmission: emissions.map(
        (annotationsByItemPage) =>
          annotationsByItemPage.get(0)?.get(0)?.[0]?.notes ?? null,
      ),
    }).toEqual({
      numberOfPublishedPages: 1,
      notesByEmission: [null, "a note"],
    })
  })

  it("emits when a layout moves an annotation to another page", async () => {
    const reader = await mountAnnotationsReader({
      Renderer: TwoPageTextDocumentRenderer,
      annotations$: new BehaviorSubject<Annotation[]>([
        // A place in the text of the paragraph of the first chapter.
        { id: "inFirstChapter", cfi: "epubcfi(/6/2!/4/2/1:3)" },
      ]),
      numberOfAdjacentSpineItemToPreLoad: 0,
      bookManifest: reflowableManifest,
    })

    // jsdom has no layout: the text measures where the second page starts.
    giveRangesOfFrameOneRect(reader, 0, new DOMRect(viewport.width, 0, 10, 10))

    const emissions = recordAnnotationsByItemPage(reader)

    await vi.runAllTimersAsync()

    // The text moves to the first page, which the next layout gives.
    giveRangesOfFrameOneRect(reader, 0, new DOMRect(0, 0, 10, 10))
    reader.layout()
    await vi.runAllTimersAsync()

    expect(emissions.map(toAnnotationIds)).toEqual([
      { 0: { 1: ["inFirstChapter"] } },
      { 0: { 0: ["inFirstChapter"] } },
    ])
  })

  it("gives an annotation of a reflowable chapter the page of its text, keeps it while a layout of the chapter is pending, gives one added in that time a page once the layout completes, and drops them once the chapter unloads", async () => {
    const chapterLayout = createLayoutHold({
      Renderer: TwoPageTextDocumentRenderer,
      startsHeld: false,
    })
    const inFirstChapter = {
      id: "inFirstChapter",
      // A place in the text of the paragraph.
      cfi: "epubcfi(/6/2!/4/2/1:3)",
    }
    const atRootOfSecondChapter = {
      id: "atRootOfSecondChapter",
      cfi: "epubcfi(/6/4!)",
    }
    const annotations$ = new BehaviorSubject<Annotation[]>([
      inFirstChapter,
      atRootOfSecondChapter,
    ])
    const reader = await mountAnnotationsReader({
      Renderer: chapterLayout.Renderer,
      annotations$,
      numberOfAdjacentSpineItemToPreLoad: 0,
      bookManifest: reflowableManifest,
    })
    const firstChapter = getSpineItem(reader, 0)

    // jsdom has no layout: the text measures where the second page starts.
    giveRangesOfFrameOneRect(reader, 0, new DOMRect(viewport.width, 0, 10, 10))

    const emissions = recordAnnotationsByItemPage(reader)

    await vi.runAllTimersAsync()

    chapterLayout.hold()
    reader.layout()
    await vi.runAllTimersAsync()

    // The app adds an annotation of the chapter while the layout is pending.
    annotations$.next([
      inFirstChapter,
      atRootOfSecondChapter,
      { id: "addedWhileHeld", cfi: "epubcfi(/6/2!/4/2/1:5)" },
    ])
    await vi.runAllTimersAsync()

    const whileHeld = {
      isFirstChapterLayoutCurrent:
        reader.spine.isLayoutCurrentFor(firstChapter),
      annotationIds: toAnnotationIds(emissions.at(-1) ?? new Map()),
    }

    chapterLayout.release()
    await vi.runAllTimersAsync()

    const onceLaidOut = toAnnotationIds(emissions.at(-1) ?? new Map())

    // The first chapter unloads while no layout can complete.
    chapterLayout.hold()
    await goToSpineItem(reader, 1)

    expect({
      numberOfPagesOfFirstChapter: firstChapter.pageGeometry.numberOfPages,
      whileHeld,
      onceLaidOut,
      loadStatusOfFirstChapter: firstChapter.value.loadStatus,
      onceUnloaded: toAnnotationIds(emissions.at(-1) ?? new Map()),
    }).toEqual({
      numberOfPagesOfFirstChapter: 2,
      whileHeld: {
        isFirstChapterLayoutCurrent: false,
        annotationIds: {
          0: { 1: ["inFirstChapter"] },
          1: { 0: ["atRootOfSecondChapter"] },
        },
      },
      onceLaidOut: {
        0: { 1: ["inFirstChapter", "addedWhileHeld"] },
        1: { 0: ["atRootOfSecondChapter"] },
      },
      loadStatusOfFirstChapter: "idle",
      onceUnloaded: { 1: { 0: ["atRootOfSecondChapter"] } },
    })
  })
})
