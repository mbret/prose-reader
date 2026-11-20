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
import type { Annotation, BookmarksByItemPage } from "../types.ts"

installAnnotationsReaderTestEnvironment()

/** The ids of the bookmarks of each page, by spine item, then by page. */
const toBookmarkIds = (bookmarksByItemPage: BookmarksByItemPage) =>
  Object.fromEntries(
    Array.from(bookmarksByItemPage, ([itemIndex, bookmarksByPage]) => [
      itemIndex,
      Object.fromEntries(
        Array.from(bookmarksByPage, ([pageIndex, bookmarks]) => [
          pageIndex,
          bookmarks.map(({ id }) => id),
        ]),
      ),
    ]),
  )

/**
 * Records what `bookmarksByItemPage$` emits, from one subscription held until
 * the test ends, as an app holds it.
 */
const recordBookmarksByItemPage = (reader: AnnotationsReader) => {
  const emissions: BookmarksByItemPage[] = []

  subscriptions.push(
    reader.annotations.bookmarksByItemPage$.subscribe((bookmarksByItemPage) => {
      emissions.push(bookmarksByItemPage)
    }),
  )

  return emissions
}

/** A range of the second item: a highlight. */
const highlight: Annotation = {
  id: "highlight",
  cfi: "epubcfi(/6/4!/4/2,/1:0,/1:3)",
}

describe("bookmarksByItemPage$", () => {
  it("completes when the reader is destroyed", async () => {
    const { reader } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const bookmarksByItemPageSubscription =
      reader.annotations.bookmarksByItemPage$.subscribe()

    subscriptions.push(bookmarksByItemPageSubscription)
    reader.destroy()

    expect(bookmarksByItemPageSubscription.closed).toBe(true)
  })

  it("gives the bookmarks of each page in the order of the list, and leaves the highlights out", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const emissions = recordBookmarksByItemPage(reader)

    annotations$.next([
      createAnnotationAtRootOfSpineItem(reader, 1, "second"),
      createAnnotationAtRootOfSpineItem(reader, 0, "first"),
      highlight,
      createAnnotationAtRootOfSpineItem(reader, 0, "alsoOnFirstPage"),
    ])
    await vi.runAllTimersAsync()

    expect(emissions.map(toBookmarkIds).at(-1)).toEqual({
      0: { 0: ["first", "alsoOnFirstPage"] },
      1: { 0: ["second"] },
    })
  })

  it("emits nothing when a highlight changes or when pages that move no bookmark are published, and emits a bookmark that changes", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const bookmark = createAnnotationAtRootOfSpineItem(reader, 0, "bookmark")
    let numberOfPublishedPages = 0

    annotations$.next([bookmark, highlight])

    const emissions = recordBookmarksByItemPage(reader)

    await vi.runAllTimersAsync()

    subscriptions.push(
      reader.spine.layout$.subscribe(() => {
        numberOfPublishedPages++
      }),
    )

    annotations$.next([bookmark, { ...highlight, selected: true }])
    await vi.runAllTimersAsync()
    reader.layout()
    await vi.runAllTimersAsync()
    annotations$.next([{ ...bookmark, notes: "a note" }, highlight])
    await vi.runAllTimersAsync()

    expect({
      numberOfPublishedPages,
      notesOfBookmarkByEmission: emissions.map(
        (bookmarksByItemPage) =>
          bookmarksByItemPage.get(0)?.get(0)?.[0]?.notes ?? null,
      ),
    }).toEqual({
      numberOfPublishedPages: 1,
      notesOfBookmarkByEmission: [null, "a note"],
    })
  })

  it("emits when a layout moves a bookmark to another page", async () => {
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

    const emissions = recordBookmarksByItemPage(reader)

    await vi.runAllTimersAsync()

    // The text moves to the first page, which the next layout gives.
    giveRangesOfFrameOneRect(reader, 0, new DOMRect(0, 0, 10, 10))
    reader.layout()
    await vi.runAllTimersAsync()

    expect(emissions.map(toBookmarkIds)).toEqual([
      { 0: { 1: ["inFirstChapter"] } },
      { 0: { 0: ["inFirstChapter"] } },
    ])
  })

  it("gives a bookmark of a reflowable chapter the page of its text, keeps it while a layout of the chapter is pending, gives one added in that time a page once the layout completes, and drops them once the chapter unloads", async () => {
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

    const emissions = recordBookmarksByItemPage(reader)

    await vi.runAllTimersAsync()

    chapterLayout.hold()
    reader.layout()
    await vi.runAllTimersAsync()

    // The app adds a bookmark of the chapter while the layout is pending.
    annotations$.next([
      inFirstChapter,
      atRootOfSecondChapter,
      { id: "addedWhileHeld", cfi: "epubcfi(/6/2!/4/2/1:5)" },
    ])
    await vi.runAllTimersAsync()

    const whileHeld = {
      isFirstChapterLayoutCurrent:
        reader.spine.isLayoutCurrentFor(firstChapter),
      bookmarkIds: toBookmarkIds(emissions.at(-1) ?? new Map()),
    }

    chapterLayout.release()
    await vi.runAllTimersAsync()

    const onceLaidOut = toBookmarkIds(emissions.at(-1) ?? new Map())

    // The first chapter unloads while no layout can complete.
    chapterLayout.hold()
    await goToSpineItem(reader, 1)

    expect({
      numberOfPagesOfFirstChapter: firstChapter.pageGeometry.numberOfPages,
      whileHeld,
      onceLaidOut,
      loadStatusOfFirstChapter: firstChapter.value.loadStatus,
      onceUnloaded: toBookmarkIds(emissions.at(-1) ?? new Map()),
    }).toEqual({
      numberOfPagesOfFirstChapter: 2,
      whileHeld: {
        isFirstChapterLayoutCurrent: false,
        bookmarkIds: {
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
