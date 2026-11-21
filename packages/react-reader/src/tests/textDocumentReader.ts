import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { EMPTY, of } from "rxjs"
import { beforeAll, expect, vi } from "vitest"

/** jsdom has no layout, so every element reports this size. */
export const viewport = { width: 400, height: 600 }

/**
 * Renders each item as a text document in a frame, the way the html renderer
 * does, so that its text can be selected and a cfi resolves in it.
 */
class TextDocumentRenderer extends DocumentRenderer {
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

/**
 * Two single pages, each a candidate for a bookmark once laid out, since a
 * pre-paginated page always is.
 */
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

/** Gives every test of the file the layout that a reader needs in jsdom. */
export const installJsdomLayout = () => {
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
}

const createAppReader = gesturesEnhancer(annotationsEnhancer(createReader))

export type TextDocumentReader = ReturnType<typeof createAppReader>

/**
 * Mounts a reader of the two text pages, and resolves once it shows the
 * first one, ready.
 */
export const mountTextDocumentReader =
  async (): Promise<TextDocumentReader> => {
    const reader = createAppReader({
      manifest,
      getRenderer: () => (props) => new TextDocumentRenderer(props),
      getResource: () => of(new Response("", { status: 200 })),
    })

    const readerElement = document.createElement("div")
    document.body.appendChild(readerElement)
    reader.mount(readerElement)

    await vi.waitFor(() =>
      expect(reader.spineItemsManager.get(0)?.value.isReady).toBe(true),
    )

    return reader
  }
