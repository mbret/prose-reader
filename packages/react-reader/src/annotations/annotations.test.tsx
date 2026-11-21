/* @vitest-environment happy-dom */

import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import {
  type Annotation,
  annotationsEnhancer,
} from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { EMPTY, of } from "rxjs"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { ReactReader } from "../ReactReader.tsx"
import { ReactReaderProvider } from "../ReactReaderProvider.tsx"

/**
 * Renders each item as an empty element, so it is loaded and ready at once:
 * happy-dom loads no frame. No cfi resolves in it.
 */
class EmptyRenderer extends DocumentRenderer {
  onUnload() {}

  onCreateDocument() {
    return of(this.context.document.createElement("div"))
  }

  onLoadDocument() {
    return EMPTY
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }
}

const createBook = (
  numberOfChapters: number,
  renditionLayout: Manifest["renditionLayout"] = "reflowable",
): Manifest => ({
  filename: "book.epub",
  mediaType: "application/epub+zip",
  title: "Book",
  renditionLayout,
  renditionSpread: undefined,
  readingDirection: "ltr",
  items: [],
  spineItems: Array.from({ length: numberOfChapters }, (_, index) => ({
    id: `chapter-${index}`,
    index,
    href: `chapter-${index}.xhtml`,
    mediaType: "application/xhtml+xml",
    containerUri: `chapter-${index}.xhtml`,
  })),
})

const getChapterStep = (chapterIndex: number) => (chapterIndex + 1) * 2

const createPageBookmark = (chapterIndex: number): Annotation => ({
  id: `bookmark-${chapterIndex}`,
  cfi: `epubcfi(/6/${getChapterStep(chapterIndex)}!/4/2/1:3)`,
})

const createHighlight = (chapterIndex: number): Annotation => ({
  id: `highlight-${chapterIndex}`,
  cfi: `epubcfi(/6/${getChapterStep(chapterIndex)}!/4/2,/1:0,/1:5)`,
  highlightColor: "yellow",
})

const annotationsAwayFromTheFirstChapter = [
  createPageBookmark(5),
  createPageBookmark(6),
  createHighlight(7),
]

const createAppReader = gesturesEnhancer(annotationsEnhancer(createReader))

type AppReader = ReturnType<typeof createAppReader>

/** happy-dom lays nothing out, so every element has this size. */
const elementSize = { width: 600, height: 800 }

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => elementSize.width,
  })
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => elementSize.height,
  })
})

afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "clientWidth")
  Reflect.deleteProperty(HTMLElement.prototype, "clientHeight")
})

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  container = document.createElement(`div`)
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  vi.useRealTimers()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false })
  container.remove()
})

const openBook = async ({
  numberOfChapters = 10,
  renditionLayout,
  annotations,
}: {
  numberOfChapters?: number
  renditionLayout?: Manifest["renditionLayout"]
  annotations: Annotation[]
}) => {
  let reader: AppReader | undefined

  const createBookReader = () => {
    reader = createAppReader({
      manifest: createBook(numberOfChapters, renditionLayout),
      numberOfAdjacentSpineItemToPreLoad: 0,
      getRenderer: () => (props) => new EmptyRenderer(props),
    })
    vi.spyOn(reader, "locateResource")

    return reader
  }

  /** Renders the app with these annotations, as an app does when they change. */
  const setAnnotations = (annotations: Annotation[]) =>
    act(async () => {
      root.render(
        <ChakraProvider value={defaultSystem}>
          <ReactReaderProvider
            createReader={createBookReader}
            annotations={annotations}
          >
            <ReactReader quickMenuOpen />
          </ReactReaderProvider>
        </ChakraProvider>,
      )
    })

  await setAnnotations(annotations)
  await letTimePass()

  if (!reader) throw new Error("react-reader created no reader")

  expect(reader.pagination.state.isSettled).toBe(true)

  return { reader, setAnnotations }
}

/**
 * Advances the fake clock far enough for the reader's idle callbacks and
 * debounces to run.
 */
const letTimePass = () => act(() => vi.advanceTimersByTimeAsync(3000))

const getLoadedChapterIndexes = (reader: AppReader) =>
  reader.spineItemsManager.items
    .filter((item) => item.value.loadStatus !== "idle")
    .map((item) => item.index)

const clickButton = async (isButton: (button: HTMLElement) => boolean) => {
  const button = [...document.querySelectorAll(`button`)].find(isButton)

  if (!button) throw new Error("no such button")

  await act(async () => {
    button.click()
  })
}

describe("the chapters react-reader loads for annotations", () => {
  it("loads the same chapters with annotations away from the reading position as without", async () => {
    const loadedWithoutAnnotations = getLoadedChapterIndexes(
      (await openBook({ annotations: [] })).reader,
    )
    const loadedWithAnnotations = getLoadedChapterIndexes(
      (await openBook({ annotations: annotationsAwayFromTheFirstChapter }))
        .reader,
    )

    expect({ loadedWithoutAnnotations, loadedWithAnnotations }).toEqual({
      loadedWithoutAnnotations: [0],
      loadedWithAnnotations: [0],
    })
  })

  it("loads the chapters of the bookmarks the Annotations dialog lists while it is open, and releases them once it closes", async () => {
    const { reader } = await openBook({
      annotations: annotationsAwayFromTheFirstChapter,
    })
    const loadedBeforeOpening = getLoadedChapterIndexes(reader)

    await clickButton(
      (button) => button.getAttribute(`aria-label`) === `Bookmarks`,
    )
    await letTimePass()
    const loadedWhileOpen = getLoadedChapterIndexes(reader)

    await clickButton((button) => button.textContent === `Cancel`)
    await letTimePass()

    expect({
      loadedBeforeOpening,
      loadedWhileOpen,
      loadedAfterClosing: getLoadedChapterIndexes(reader),
    }).toEqual({
      loadedBeforeOpening: [0],
      // The highlight of chapter 7 is on the other tab.
      loadedWhileOpen: [0, 5, 6],
      loadedAfterClosing: [0],
    })
  })

  it("locates as many times for a book of many pages as for a book of few", async () => {
    const countLocateCalls = async (numberOfChapters: number) => {
      const { reader } = await openBook({
        numberOfChapters,
        annotations: annotationsAwayFromTheFirstChapter,
      })

      expect(reader.spine.pages.value.pages).toHaveLength(numberOfChapters)

      return vi.mocked(reader.locateResource).mock.calls.length
    }

    const locateCallsForFewPages = await countLocateCalls(8)
    const locateCallsForManyPages = await countLocateCalls(30)

    expect(locateCallsForManyPages).toBe(locateCallsForFewPages)
  })
})

describe("the bookmark markers", () => {
  /**
   * A pre-paginated book gives every annotation its page at once. Only a
   * chapter that is ready shows a marker: the first one, which the reader
   * shows.
   */
  it("mark a page that holds a bookmark, also after a highlight, and not a page that holds a highlight only", async () => {
    const countMarkersWith = async (annotations: Annotation[]) => {
      await openBook({ renditionLayout: "pre-paginated", annotations })

      return document.querySelectorAll(`[data-bookmark-area]`).length
    }

    expect({
      markersWithABookmark: await countMarkersWith([createPageBookmark(0)]),
      markersWithAHighlightThenABookmark: await countMarkersWith([
        createHighlight(0),
        createPageBookmark(0),
      ]),
      markersWithAHighlight: await countMarkersWith([createHighlight(0)]),
    }).toEqual({
      markersWithABookmark: 1,
      markersWithAHighlightThenABookmark: 1,
      markersWithAHighlight: 0,
    })
  })
})

describe("the tabs of the Annotations dialog", () => {
  /**
   * A row locates its annotation in the load mode, so the chapters loaded
   * while a tab is open are those of the annotations it lists.
   */
  it("list a bookmark, with a note or without, under Bookmarks, and a highlight under Annotations, each once", async () => {
    const { reader } = await openBook({
      annotations: [
        createPageBookmark(5),
        { ...createPageBookmark(6), notes: "A note" },
        createHighlight(7),
      ],
    })

    await clickButton(
      (button) => button.getAttribute(`aria-label`) === `Bookmarks`,
    )
    await letTimePass()
    const loadedForBookmarks = getLoadedChapterIndexes(reader)
    const bookmarkRows =
      document.querySelectorAll(`[role="tabpanel"] li`).length

    await clickButton(
      (button) =>
        button.getAttribute(`role`) === `tab` &&
        button.textContent === `Annotations`,
    )
    await letTimePass()

    expect({
      loadedForBookmarks,
      bookmarkRows,
      loadedForHighlights: getLoadedChapterIndexes(reader),
      highlightRows: document.querySelectorAll(`[role="tabpanel"] li`).length,
    }).toEqual({
      loadedForBookmarks: [0, 5, 6],
      bookmarkRows: 2,
      loadedForHighlights: [0, 7],
      highlightRows: 1,
    })
  })
})

describe("a row of the Annotations dialog", () => {
  const getFirstRowOfTheOpenTab = () => {
    const row = document.querySelector<HTMLElement>(
      `[role="tabpanel"] li button`,
    )

    if (!row) throw new Error("the open tab lists no row")

    return row
  }

  it("navigates the reader, and leaves the URL of the page as it was", async () => {
    const bookmark = createPageBookmark(5)
    const { reader } = await openBook({ annotations: [bookmark] })
    const goToCfi = vi.spyOn(reader.navigation, "goToCfi")
    const pageUrlBeforeTheClick = window.location.href

    await clickButton(
      (button) => button.getAttribute(`aria-label`) === `Bookmarks`,
    )
    const row = getFirstRowOfTheOpenTab()
    await act(async () => {
      row.click()
    })

    expect({
      navigatedTo: goToCfi.mock.calls,
      pageUrl: window.location.href,
    }).toEqual({
      navigatedTo: [[bookmark.cfi]],
      pageUrl: pageUrlBeforeTheClick,
    })
  })

  /**
   * No cfi resolves in the documents of this book, so the row can show only
   * the text its annotation holds.
   */
  it("shows the text of its highlight before the highlight is located", async () => {
    const highlight = {
      ...createHighlight(7),
      highlightedText: "The highlighted text",
    }
    const { setAnnotations } = await openBook({ annotations: [] })

    await setAnnotations([highlight])
    await clickButton(
      (button) => button.getAttribute(`aria-label`) === `Bookmarks`,
    )
    await clickButton(
      (button) =>
        button.getAttribute(`role`) === `tab` &&
        button.textContent === `Annotations`,
    )

    expect(getFirstRowOfTheOpenTab().textContent).toContain(
      highlight.highlightedText,
    )
  })

  it("shows the note of its annotation, and navigates to its cfi, before the annotation is located", async () => {
    const bookmark = { ...createPageBookmark(5), notes: "A note" }
    const { reader, setAnnotations } = await openBook({ annotations: [] })
    const goToCfi = vi.spyOn(reader.navigation, "goToCfi")

    /**
     * The app adds a bookmark, and the clock stands still: the idle callback
     * its first location waits for does not run before the click.
     */
    await setAnnotations([bookmark])
    await clickButton(
      (button) => button.getAttribute(`aria-label`) === `Bookmarks`,
    )

    const row = getFirstRowOfTheOpenTab()
    const noteIndicator = row.querySelector(`svg`)

    if (!noteIndicator) throw new Error("the row has no note indicator")

    const noteIndicatorVisibility = getComputedStyle(noteIndicator).visibility

    await act(async () => {
      row.click()
    })

    expect({
      noteIndicatorVisibility,
      navigatedTo: goToCfi.mock.calls,
    }).toEqual({
      noteIndicatorVisibility: "visible",
      navigatedTo: [[bookmark.cfi]],
    })
  })
})
