import {
  createReader,
  DocumentRenderer,
  type Manifest,
  type Reader,
} from "@prose-reader/core"
import { EMPTY, type Observable, of } from "rxjs"
import { afterEach, beforeAll, vi } from "vitest"
import { annotationsEnhancer } from "../annotationsEnhancer.ts"
import type { Annotation, AnnotationsEnhancerAPI } from "../types.ts"

/**
 * Drives a real reader with the annotations enhancer in jsdom. jsdom has no
 * layout: an item renders as an empty element, so no cfi resolves and no
 * highlight is measured. What the tests can see is the lifecycle: which
 * highlights exist, and when.
 */

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 400, height: 600 }

/** Renders each item as an empty element, so it is ready once loaded. */
export class EmptyRenderer extends DocumentRenderer {
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

/** Two single pages, each a candidate once laid out. */
const manifest: Manifest = {
  filename: "test",
  mediaType: "application/vnd.comicbook+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.jpg`,
    containerUri: `page_${index}.jpg`,
    id: `${index}`,
    index,
    mediaType: "image/jpeg",
    progressionWeight: 0.5,
    renditionLayout: "pre-paginated",
  })),
}

export const createCfiOfItem = (
  itemIndex: number,
  { elementIndex = 0 }: { elementIndex?: number } = {},
) => `epubcfi(/6/${(itemIndex + 1) * 2}!/4/${(elementIndex + 1) * 2})`

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

/**
 * Mounts a reader of the test book, with fake timers, and runs them until the
 * reader has settled. The reader is destroyed after the test.
 */
export const mountAnnotationsReader = async ({
  Renderer = EmptyRenderer,
  annotations$,
}: {
  Renderer?: typeof EmptyRenderer
  annotations$?: Observable<Annotation[]>
} = {}): Promise<Reader & AnnotationsEnhancerAPI> => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    annotations: { annotations$ },
  })
  readers.push(reader)

  const container = document.createElement("div")
  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  return reader
}

/**
 * The annotation ids of the highlights in the document, sorted. A highlight
 * creates its element as soon as it exists, with no layout, so this is the
 * set of highlights alive in the reader.
 */
export const readHighlightedAnnotationIds = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>("[data-highlight-container]"),
    (element) => element.dataset.highlightContainer,
  ).sort()
