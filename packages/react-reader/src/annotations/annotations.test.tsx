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

    return reader
  }

  await act(async () => {
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
  await letTimePass()

  if (!reader) throw new Error("react-reader created no reader")

  expect(reader.pagination.state.isSettled).toBe(true)

  return reader
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
      await openBook({ annotations: [] }),
    )
    const loadedWithAnnotations = getLoadedChapterIndexes(
      await openBook({ annotations: annotationsAwayFromTheFirstChapter }),
    )

    expect({ loadedWithoutAnnotations, loadedWithAnnotations }).toEqual({
      loadedWithoutAnnotations: [0],
      loadedWithAnnotations: [0],
    })
  })

  it("loads the chapters of the bookmarks the Annotations dialog lists while it is open, and releases them once it closes", async () => {
    const reader = await openBook({
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
})

describe("the bookmark markers", () => {
  /**
   * A pre-paginated book gives every annotation of the first chapter, which
   * the reader shows, its first page at once.
   */
  it("mark a page that holds a bookmark, and not a page that holds a highlight only", async () => {
    const countMarkersWith = async (annotations: Annotation[]) => {
      await openBook({ renditionLayout: "pre-paginated", annotations })

      return document.querySelectorAll(`[data-bookmark-area]`).length
    }

    expect({
      markersWithABookmark: await countMarkersWith([createPageBookmark(0)]),
      markersWithAHighlight: await countMarkersWith([createHighlight(0)]),
    }).toEqual({ markersWithABookmark: 1, markersWithAHighlight: 0 })
  })
})

describe("the tabs of the Annotations dialog", () => {
  /**
   * A row locates its annotation in the load mode, so the chapters loaded
   * while a tab is open are those of the annotations it lists.
   */
  it("list a bookmark, with a note or without, under Bookmarks, and a highlight under Annotations, each once", async () => {
    const reader = await openBook({
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
