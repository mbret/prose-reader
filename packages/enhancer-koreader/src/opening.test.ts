// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
  type NavigationTarget,
  type ReadingPosition,
} from "@prose-reader/core"
import { EMPTY, first, map, type Observable, of, ReplaySubject } from "rxjs"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import {
  type KoreaderProgressNavigationTarget,
  koreaderEnhancer,
} from "./koreaderEnhancer"

/**
 * Drives a mounted reader built with the enhancer, the way core's own
 * `opening.test.ts` drives its reader: a KOReader `progress` given at
 * creation is where the reader opens. jsdom lays nothing out, so whether the
 * place is shown, and the reading position a success there, is the browser
 * suite's to check.
 */

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 100, height: 200 }

/**
 * Renders a spine item as a document of two paragraphs in a frame, the way
 * the html renderer does, so a place in it can be found and named. The
 * document loads once `documentLoadReleased$` emits.
 */
class TwoParagraphsRenderer extends DocumentRenderer {
  constructor(
    params: ConstructorParameters<typeof DocumentRenderer>[0],
    private readonly documentLoadReleased$: Observable<unknown>,
  ) {
    super(params)
  }

  onCreateDocument() {
    return of(this.context.document.createElement("iframe"))
  }

  onLoadDocument() {
    return this.documentLoadReleased$.pipe(
      first(),
      map(() => {
        this.attach()

        const frameDocument = this.getDocumentFrame()?.contentDocument

        if (!frameDocument) throw new Error("the frame has no document")

        frameDocument.body.innerHTML = `<p>The first paragraph.</p><p>The second paragraph.</p>`

        /**
         * jsdom gives ranges no measurements at all: here they measure what
         * the body does, as its elements measure nothing. The frame has a
         * `Range` of its own.
         */
        const { body } = frameDocument
        const rangePrototype: Range = Object.getPrototypeOf(
          frameDocument.createRange(),
        )

        rangePrototype.getBoundingClientRect = () =>
          body.getBoundingClientRect()
        rangePrototype.getClientRects = () => body.getClientRects()

        return undefined
      }),
    )
  }

  onUnload() {}

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    const frame = this.documentContainer

    return frame instanceof HTMLIFrameElement ? frame : undefined
  }
}

/** Two spine items, each half the book and one page. */
const createManifest = (
  mediaType: string,
  extension: string,
  itemMediaType: string,
): Manifest => ({
  filename: `book.${extension}`,
  mediaType,
  title: "",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    id: `item-${index}`,
    index,
    href: `file://item-${index}.${extension}`,
    containerUri: `item-${index}.${extension}`,
    mediaType: itemMediaType,
    progressionWeight: 0.5,
    renditionLayout: "pre-paginated",
  })),
})

/** An EPUB, whose `progress` is an xpointer. */
const epubManifest = createManifest(
  "application/epub+zip",
  "xhtml",
  "application/xhtml+xml",
)

/** A comic, whose `progress` is a page number. */
const comicManifest = createManifest(
  "application/vnd.comicbook+zip",
  "jpg",
  "image/jpeg",
)

/** jsdom has neither observer, and nothing here depends on what they report. */
class InertObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", InertObserver)
  vi.stubGlobal("IntersectionObserver", InertObserver)
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => viewport.width,
  })
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => viewport.height,
  })
})

afterAll(() => {
  vi.unstubAllGlobals()
})

const readers: { destroy: () => void }[] = []

afterEach(() => {
  for (const reader of readers.splice(0)) reader.destroy()
  document.body.replaceChildren()
})

/**
 * A mounted reader built with the enhancer, opening at `target`, with every
 * reading position recorded from its creation on. The second spine item's
 * document loads once `releaseSecondItemLoad` is called; the first's at once.
 */
const openReader = ({
  manifest,
  target,
}: {
  manifest: Manifest
  target?: KoreaderProgressNavigationTarget | NavigationTarget<"spineItem">
}) => {
  const secondItemLoadReleased = new ReplaySubject<void>(1)
  const reader = koreaderEnhancer(createReader)({
    manifest,
    target,
    numberOfAdjacentSpineItemToPreLoad: 0,
    getResource: () => of(new Response("", { status: 200 })),
    getRenderer: (item) => (props) =>
      new TwoParagraphsRenderer(
        props,
        item.index === 1 ? secondItemLoadReleased : of(undefined),
      ),
  })

  readers.push(reader)

  const positions: ReadingPosition[] = []

  reader.navigation.readingPosition$.subscribe((position) => {
    positions.push(position)
  })

  const container = document.createElement("div")

  document.body.appendChild(container)
  reader.mount(container)

  return {
    reader,
    positions,
    releaseSecondItemLoad: () => {
      secondItemLoadReleased.next()
      secondItemLoadReleased.complete()
    },
  }
}

type OpenedReader = ReturnType<typeof openReader>

/** The index of the spine item each reading position names. */
const getSpineItemIndexes = ({ reader, positions }: OpenedReader) =>
  positions.map(({ cfi }) => reader.cfi.getSpineItemFromCfi(cfi)?.index)

/**
 * The reading position of a navigation to a spine item still loading: its
 * start, each item being half the book.
 */
const standingInAtSpineItemStart = (
  { reader }: OpenedReader,
  spineItemIndex: number,
): ReadingPosition => {
  const item = reader.spineItemsManager.get(spineItemIndex)

  if (!item) throw new Error(`no spine item ${spineItemIndex}`)

  return {
    cfi: reader.cfi.generateRootCfi(item.item),
    percentageEstimateOfBook: spineItemIndex * 0.5,
    status: "pending",
  }
}

/** Resolves once the reader has opened, with its first reading position. */
const openingReadingPosition = async ({ positions }: OpenedReader) => {
  await vi.waitFor(() => expect(positions).not.toHaveLength(0))

  return positions[0]
}

describe("where the reader opens", () => {
  it("is the place an xpointer names, in a chapter not loaded yet, without its reading position passing through the start of the book", async () => {
    const xpointer = "/body/DocFragment[2]/body/p[2]"
    const opened = openReader({
      manifest: epubManifest,
      target: { type: "koreaderProgress", value: xpointer },
    })

    // While the chapter loads, the reading position stands in at its start.
    expect(await openingReadingPosition(opened)).toEqual(
      standingInAtSpineItemStart(opened, 1),
    )

    opened.releaseSecondItemLoad()

    // Loaded, the chapter shows the place the pointer names.
    await vi.waitFor(() =>
      expect(
        opened.reader.koreader.cfiToProgress(
          opened.positions.at(-1)?.cfi ?? "",
        ),
      ).toBe(xpointer),
    )

    expect(getSpineItemIndexes(opened)).toEqual(opened.positions.map(() => 1))
  })

  it("is the spine item showing the page a page number names", async () => {
    const opened = openReader({
      manifest: comicManifest,
      target: { type: "koreaderProgress", value: "2" },
    })

    expect(await openingReadingPosition(opened)).toEqual(
      standingInAtSpineItemStart(opened, 1),
    )

    opened.releaseSecondItemLoad()

    await vi.waitFor(() =>
      expect(opened.positions.at(-1)?.status).toBe("success"),
    )

    expect(getSpineItemIndexes(opened)).toEqual(opened.positions.map(() => 1))
    expect(
      opened.reader.koreader.cfiToProgress(opened.positions.at(-1)?.cfi ?? ""),
    ).toBe("2")
  })

  it.each([
    [
      "an xpointer into a chapter the book does not have",
      "/body/DocFragment[9]/body",
    ],
    ["a page number, which an EPUB has no progress of", "2"],
    ["a value that is not a progress", "not a progress"],
  ])(
    "is the start of the book for %s, as without a target",
    async (_, progress) => {
      const opened = openReader({
        manifest: epubManifest,
        target: { type: "koreaderProgress", value: progress },
      })

      expect(await openingReadingPosition(opened)).toEqual(
        standingInAtSpineItemStart(opened, 0),
      )
    },
  )

  it("is a target the reader it enhances opens at, such as a spine item", async () => {
    const opened = openReader({
      manifest: epubManifest,
      target: { type: "spineItem", value: 1 },
    })

    expect(await openingReadingPosition(opened)).toEqual(
      standingInAtSpineItemStart(opened, 1),
    )
  })
})
