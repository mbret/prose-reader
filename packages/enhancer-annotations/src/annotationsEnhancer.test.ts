// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import { BehaviorSubject, EMPTY, first, map, of } from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { annotationsEnhancer } from "./annotationsEnhancer.ts"

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 400, height: 600 }

/** Renders each item as an empty element, so it is ready once loaded. */
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

  getDocumentFrame(): HTMLIFrameElement | undefined {
    return undefined
  }
}

/**
 * Renders each item as a text document in a frame, the way the html renderer
 * does, so that its text can be selected.
 */
class TextDocumentRenderer extends EmptyRenderer {
  onCreateDocument() {
    return of(this.context.document.createElement("iframe"))
  }

  onLoadDocument() {
    this.attach()

    const frameDocument = this.getDocumentFrame()?.contentDocument

    if (!frameDocument) throw new Error("the frame has no document")

    frameDocument.body.innerHTML = `<p>A paragraph of text.</p>`

    return EMPTY
  }

  getDocumentFrame() {
    const frame = this.documentContainer

    return frame instanceof HTMLIFrameElement ? frame : undefined
  }
}

/**
 * Holds every layout while held, so that the spine publishes no pages until
 * it is released.
 */
const createLayoutHold = () => {
  const isLayoutHeld = new BehaviorSubject(true)

  class HeldLayoutRenderer extends EmptyRenderer {
    onLayout() {
      return isLayoutHeld.pipe(
        first((isHeld) => !isHeld),
        map(() => undefined),
      )
    }
  }

  return {
    Renderer: HeldLayoutRenderer,
    release: () => isLayoutHeld.next(false),
  }
}

/** Two single pages, each a candidate once laid out. */
const manifest: Manifest = {
  filename: "test",
  mediaType: "application/epub+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.xhtml`,
    containerUri: `page_${index}.xhtml`,
    id: `${index}`,
    index,
    mediaType: "application/xhtml+xml",
    progressionWeight: 0.5,
    renditionLayout: "pre-paginated",
  })),
}

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
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, viewport.width, viewport.height),
  )
})

const readers: { destroy: () => void }[] = []

afterEach(() => {
  for (const reader of readers.splice(0)) reader.destroy()
  document.body.replaceChildren()
  vi.useRealTimers()
})

const mountAnnotationsReader = async (
  Renderer: typeof EmptyRenderer = EmptyRenderer,
) => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
  })
  readers.push(reader)

  const container = document.createElement("div")
  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  return reader
}

/** Records what `candidates$` emits, from one subscription. */
const observeCandidates = (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
) => {
  const emissions: boolean[][] = []

  reader.annotations.candidates$.subscribe((candidates) =>
    emissions.push(candidates),
  )

  return emissions
}

describe("candidates$", () => {
  /**
   * Until the first layout ends, the reader has published no pages. A
   * consumer that reads the candidates with `withLatestFrom`, as react-reader's
   * bookmark hook does, needs a value then: from a stream that has emitted
   * nothing, it gets none, and gives no verdict.
   */
  it("emits an empty array while the reader has published no pages, then one candidate per page", async () => {
    const layoutHold = createLayoutHold()
    const reader = await mountAnnotationsReader(layoutHold.Renderer)

    expect(reader.spine.pages.value.pages).toEqual([])

    const emissions = observeCandidates(reader)

    expect(emissions).toEqual([[]])

    layoutHold.release()
    await vi.runAllTimersAsync()

    expect(emissions.at(-1)).toEqual([true, true])
  })

  it("gives one candidate per published page", async () => {
    const reader = await mountAnnotationsReader()

    expect(observeCandidates(reader)).toEqual([[true, true]])
  })
})

/**
 * Selects text in the document of an item and releases the pointer, as a user
 * does. The reader then holds the selection, the event that ended it and the
 * item, in `reader.selection.getSelection()`.
 */
const selectTextAndRelease = async (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
  itemIndex: number,
) => {
  const frameDocument = reader.spineItemsManager
    .get(itemIndex)
    ?.renderer.getDocumentFrame()?.contentDocument
  const frameWindow = frameDocument?.defaultView
  const text = frameDocument?.querySelector("p")?.firstChild

  if (!frameDocument || !frameWindow || !text) {
    throw new Error(`item ${itemIndex} has no text to select`)
  }

  frameDocument.getSelection()?.setBaseAndExtent(text, 2, text, 11)
  frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerdown"))
  frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerup"))
  await vi.runAllTimersAsync()

  const selection = reader.selection.getSelection()

  if (selection?.type !== "over") {
    throw new Error("the reader holds no released selection")
  }

  return selection
}

/**
 * An app stores what `createAnnotation` returns, in IndexedDB or through
 * `postMessage`, which copy a value with the structured clone algorithm. A
 * browser cannot clone an event or a selection, so the result holds an id
 * and a cfi only.
 *
 * The tests compare the keys of the result, not whether it clones: jsdom
 * clones its events like plain objects, so a clone would succeed here with
 * the event in the result.
 */
describe("createAnnotation", () => {
  it("annotates a selection with its id and a range cfi, and nothing of the selection itself", async () => {
    const reader = await mountAnnotationsReader(TextDocumentRenderer)
    // The whole value the reader holds, event included, as an app may pass it.
    const selection = await selectTextAndRelease(reader, 0)

    const annotation = reader.annotations.createAnnotation(selection)

    expect(annotation).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
    })
    expect(reader.cfi.parseCfi(annotation?.cfi ?? "")).toMatchObject({
      itemIndex: 0,
      isCfiRange: true,
    })
  })

  it("annotates a page with its id and the cfi of its item, and not the page index", async () => {
    const reader = await mountAnnotationsReader(TextDocumentRenderer)

    const annotation = reader.annotations.createAnnotation({
      absolutePageIndex: 1,
    })

    expect(annotation).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
    })
    expect(reader.cfi.parseCfi(annotation?.cfi ?? "")).toMatchObject({
      itemIndex: 1,
      isCfiRange: false,
    })
  })

  /**
   * The selection the reader holds is the live one of the document. The user
   * can clear it before the app annotates it.
   */
  it("annotates nothing when the selection holds no range", async () => {
    const reader = await mountAnnotationsReader(TextDocumentRenderer)
    const selected = await selectTextAndRelease(reader, 0)

    selected.selection.removeAllRanges()

    expect(reader.annotations.createAnnotation(selected)).toBeUndefined()
  })
})
