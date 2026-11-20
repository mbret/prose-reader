import {
  createReader,
  DocumentRenderer,
  type Manifest,
  type Reader,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  EMPTY,
  first,
  type Observable,
  of,
  type Subscription,
  switchMap,
} from "rxjs"
import { afterEach, beforeAll, expect, vi } from "vitest"
import { annotationsEnhancer } from "../annotationsEnhancer.ts"
import type { Annotation, AnnotationsEnhancerAPI } from "../types.ts"

/** jsdom has no layout, so every element reports this size. */
export const viewport = { width: 400, height: 600 }

/** Renders each item as an empty element, so it is ready once loaded. */
export class EmptyRenderer extends DocumentRenderer {
  onUnload() {}

  onCreateDocument() {
    return of(this.context.document.createElement("div"))
  }

  onLoadDocument() {
    return EMPTY
  }

  onLayout(): Observable<{ width: number; height: number } | undefined> {
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
export class TextDocumentRenderer extends EmptyRenderer {
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
 * Gives a renderer, extending `Renderer`, whose layouts wait while held, so
 * that the spine publishes no pages until it is released. It starts held
 * unless `isHeld` is false.
 */
export const createLayoutHold = ({
  Renderer = EmptyRenderer,
  isHeld = true,
}: {
  Renderer?: typeof EmptyRenderer
  isHeld?: boolean
} = {}): {
  Renderer: typeof EmptyRenderer
  hold: () => void
  release: () => void
} => {
  const isLayoutHeld = new BehaviorSubject(isHeld)

  class HeldLayoutRenderer extends Renderer {
    onLayout() {
      return isLayoutHeld.pipe(
        first((isHeld) => !isHeld),
        switchMap(() => super.onLayout()),
      )
    }
  }

  return {
    Renderer: HeldLayoutRenderer,
    hold: () => isLayoutHeld.next(true),
    release: () => isLayoutHeld.next(false),
  }
}

/** Two single pages, each a candidate once laid out. */
export const manifest: Manifest = {
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

/** Gives every element of a window the size of the viewport. */
export const giveElementsTheViewportSize = (
  windowOfElements: Window & typeof globalThis,
) => {
  const { HTMLElement } = windowOfElements

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
}

const readers: { destroy: () => void }[] = []

export const subscriptions: Subscription[] = []

export const mountAnnotationsReader = async ({
  Renderer = EmptyRenderer,
  annotations$,
  numberOfAdjacentSpineItemToPreLoad,
  ownerDocument = document,
  bookManifest = manifest,
}: {
  Renderer?: typeof EmptyRenderer
  annotations$?: Observable<Annotation[]>
  numberOfAdjacentSpineItemToPreLoad?: number
  ownerDocument?: Document
  bookManifest?: Manifest
} = {}): Promise<AnnotationsReader> => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest: bookManifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    annotations: { annotations$ },
    numberOfAdjacentSpineItemToPreLoad,
    ownerDocument,
  })
  readers.push(reader)

  const container = ownerDocument.createElement("div")
  ownerDocument.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  return reader
}

export type AnnotationsReader = Reader & AnnotationsEnhancerAPI

export const getSpineItem = (
  reader: AnnotationsReader,
  spineItemIndex: number,
) => {
  const spineItem = reader.spineItemsManager.get(spineItemIndex)

  if (!spineItem) throw new Error(`no spine item ${spineItemIndex}`)

  return spineItem
}

export const createAnnotationAtRootOfSpineItem = (
  reader: AnnotationsReader,
  spineItemIndex: number,
  id: string,
): Annotation => ({
  id,
  cfi: reader.cfi.generateRootCfi(getSpineItem(reader, spineItemIndex).item),
})

/**
 * With no adjacent spine item preloaded, the reader holds the document of the
 * spine item it shows and no other: the first one, once mounted.
 */
export const mountReaderHoldingOneDocument = async ({
  appObservesTaps,
  Renderer,
}: {
  appObservesTaps: boolean
  Renderer?: typeof EmptyRenderer
}): Promise<{
  reader: AnnotationsReader
  annotations$: BehaviorSubject<Annotation[]>
}> => {
  const annotations$ = new BehaviorSubject<Annotation[]>([])
  const reader = await mountAnnotationsReader({
    Renderer,
    annotations$,
    numberOfAdjacentSpineItemToPreLoad: 0,
  })

  if (appObservesTaps) {
    subscriptions.push(reader.annotations.highlightTap$.subscribe())
  }

  expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["loaded", "idle"])

  return { reader, annotations$ }
}

export const getLoadStatusOfEachSpineItem = (reader: AnnotationsReader) =>
  reader.spineItemsManager.items.map((spineItem) => spineItem.value.loadStatus)

export const goToSpineItem = async (
  reader: AnnotationsReader,
  indexOrId: number,
) => {
  reader.navigation.goToSpineItem({ indexOrId })
  await vi.runAllTimersAsync()
}

/**
 * jsdom has no layout, and its ranges have no `getClientRects`. Gives each
 * range of the frame of a spine item one rect, so that a highlight draws.
 */
export const giveRangesOfFrameOneRect = (
  reader: AnnotationsReader,
  spineItemIndex: number,
  rect = new DOMRect(0, 0, 10, 10),
) => {
  const frameDocument = getSpineItem(
    reader,
    spineItemIndex,
  ).renderer.getDocumentFrame()?.contentDocument

  if (!frameDocument) {
    throw new Error(`spine item ${spineItemIndex} has no frame`)
  }

  Object.defineProperty(
    Object.getPrototypeOf(frameDocument.createRange()),
    "getClientRects",
    { configurable: true, value: () => [rect] },
  )
}

/** Two reflowable chapters. */
export const reflowableManifest: Manifest = {
  ...manifest,
  renditionLayout: "reflowable",
  spineItems: manifest.spineItems.map((spineItem) => ({
    ...spineItem,
    renditionLayout: "reflowable",
  })),
}

/** Lays each chapter out two pages wide. */
export class TwoPageTextDocumentRenderer extends TextDocumentRenderer {
  onLayout() {
    return of({ width: viewport.width * 2, height: viewport.height })
  }
}

/**
 * Gives every test of the file the environment the reader needs in jsdom,
 * and destroys what a test mounted and subscribed once it ends.
 */
export const installAnnotationsReaderTestEnvironment = () => {
  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", InertObserver)
    vi.stubGlobal("IntersectionObserver", InertObserver)
    giveElementsTheViewportSize(window)
  })

  afterEach(() => {
    for (const subscription of subscriptions.splice(0))
      subscription.unsubscribe()
    for (const reader of readers.splice(0)) reader.destroy()
    document.body.replaceChildren()
    vi.useRealTimers()
  })
}
