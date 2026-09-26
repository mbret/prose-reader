import type { Manifest } from "@prose-reader/shared"
import {
  BehaviorSubject,
  EMPTY,
  filter,
  first,
  firstValueFrom,
  map,
  type Observable,
  of,
  ReplaySubject,
  switchMap,
  timeout,
} from "rxjs"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { htmlEnhancer } from "../enhancers/html/enhancer"
import { layoutEnhancer } from "../enhancers/layout/layoutEnhancer"
import { navigationEnhancer } from "../enhancers/navigation"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import { themeEnhancer } from "../enhancers/theme"
import { zoomEnhancer } from "../enhancers/zoom"
import { type CreateReaderOptions, createReader } from "../reader"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
import {
  DocumentRenderer,
  type DocumentRendererParams,
} from "../spineItem/renderer/DocumentRenderer"
import { isHtmlTagElement } from "../utils/dom"
import { createTestManifest } from "./utils"

/**
 * Drives a real reader in jsdom, with the real renderer, for tests about the
 * in-between states a fixture cannot reproduce.
 */

/**
 * Pre-paginated items, one page each, so what is visible is unambiguous. An
 * item goes on either side of a spread unless `pageSpreads` places it, one
 * entry per item. Two items by default.
 */
export const createPrePaginatedManifest = ({
  pageSpreads = [undefined, undefined],
}: {
  pageSpreads?: ("left" | "right" | undefined)[]
} = {}): Manifest =>
  createTestManifest({
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    spineItems: pageSpreads.map((pageSpread, index) => ({
      href: `/page_${index}.jpg`,
      id: `${index}`,
      pageSpreadLeft: pageSpread === "right" ? undefined : true,
      pageSpreadRight: pageSpread === "left" ? undefined : true,
      progressionWeight: 1 / pageSpreads.length,
      renditionLayout: "pre-paginated",
      index,
    })),
  })

const createdReaders: { destroy: () => void }[] = []

/** jsdom has no layout, so element sizes come from here. */
const defaultViewport = { width: 100, height: 200 }
let viewport = { ...defaultViewport }

/**
 * jsdom has no ResizeObserver. This one never reports on its own: a test calls
 * `notifyResize` where a browser would deliver an observation, so what the
 * reader does with one is under the test's control.
 */
const watchingResizeObservers = new Set<TestResizeObserver>()
let createdResizeObservers = 0

class TestResizeObserver {
  private readonly targets = new Set<Element>()

  constructor(private readonly callback: ResizeObserverCallback) {
    createdResizeObservers += 1
  }

  observe(target: Element) {
    this.targets.add(target)
    watchingResizeObservers.add(this)
  }

  unobserve(target: Element) {
    this.targets.delete(target)

    if (this.targets.size === 0) watchingResizeObservers.delete(this)
  }

  disconnect() {
    this.targets.clear()
    watchingResizeObservers.delete(this)
  }

  notify() {
    // No entries: the reader measures the viewport itself when it lays out.
    this.callback([], this)
  }
}

/** How many observers were ever created, and how many are observing now. */
export const resizeObservers = () => ({
  created: createdResizeObservers,
  watching: watchingResizeObservers.size,
})

/** Delivers an observation to every observer that is observing something. */
export const notifyResize = () => {
  for (const observer of [...watchingResizeObservers]) observer.notify()
}

const track = <TReader extends { destroy: () => void }>(reader: TReader) => {
  createdReaders.push(reader)

  return reader
}

/** Every resource resolves at once with an empty document. */
const resolvedResource = () => of(new Response("", { status: 200 }))

/**
 * Renders an item as a text document in a frame, the way the html renderer
 * does, so a cfi resolves against real nodes. Its body holds one paragraph,
 * `/4/2`, with its text at `/4/2/1`, and nothing else.
 *
 * The default renderer has no document at all, so a cfi naming a place in an
 * item it renders can never be found, nor ruled out.
 */
export class TextDocumentRenderer extends DocumentRenderer {
  onCreateDocument() {
    const frame = this.context.document.createElement("iframe")

    this.setDocumentContainer(frame)

    return of(frame)
  }

  onLoadDocument() {
    this.attach()

    const frameDocument = this.getDocumentFrame()?.contentDocument

    if (!frameDocument) throw new Error("the frame has no document")

    frameDocument.body.innerHTML = `<p>A paragraph of text.</p>`

    /**
     * jsdom lays nothing out, and gives ranges no measurements at all: here
     * they measure nothing, as its elements do. The frame has a `Range` of its
     * own.
     */
    const { body } = frameDocument
    const rangePrototype: Range = Object.getPrototypeOf(
      frameDocument.createRange(),
    )

    rangePrototype.getBoundingClientRect = () => body.getBoundingClientRect()
    rangePrototype.getClientRects = () => body.getClientRects()

    return EMPTY
  }

  onUnload() {
    this.detach()
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    const frame = this.documentContainer

    return isHtmlTagElement(frame, "iframe") ? frame : undefined
  }
}

/** Renders every item as a text document, see {@link TextDocumentRenderer}. */
export const renderTextDocuments = () => (props: DocumentRendererParams) =>
  new TextDocumentRenderer(props)

/**
 * Keeps one item from becoming ready: its renderer finishes loading only when
 * `release` is called. Everything else runs as usual, so the item is loading
 * for exactly as long as the test needs. Every item is rendered by `Renderer`,
 * the one held included, which loads its document once released.
 */
export const holdItem = (
  href: string,
  Renderer: new (
    props: DocumentRendererParams,
  ) => DocumentRenderer = DefaultRenderer,
) => {
  const released = new ReplaySubject<void>(1)

  const loadDocumentOnceReleased = (renderer: DocumentRenderer) => {
    const loadDocument = renderer.onLoadDocument.bind(renderer)

    renderer.onLoadDocument = () =>
      released.pipe(
        first(),
        switchMap(() => loadDocument()),
      )

    return renderer
  }

  return {
    getRenderer:
      (item: Manifest["spineItems"][number]) =>
      (props: DocumentRendererParams) =>
        item.href === href
          ? loadDocumentOnceReleased(new Renderer(props))
          : new Renderer(props),
    release: () => {
      released.next()
      released.complete()
    },
  }
}

/**
 * Lets a test stop the spine's layout pass at one item: while held, that item's
 * layout does not complete, so the pass has laid out the items before it and
 * waits. Layouts run normally until `hold` is called. `layoutsStarted` counts
 * the layouts of that item, which tells a test a pass has reached it.
 */
export const holdItemLayout = (href: string) => {
  const isHeld = new BehaviorSubject(false)
  let layoutsStarted = 0

  class HeldLayoutRenderer extends DefaultRenderer {
    onLayout() {
      layoutsStarted += 1

      return isHeld.pipe(
        first((held) => !held),
        map(() => undefined),
      )
    }
  }

  return {
    getRenderer:
      (item: Manifest["spineItems"][number]) =>
      (props: DocumentRendererParams) =>
        item.href === href
          ? new HeldLayoutRenderer(props)
          : new DefaultRenderer(props),
    hold: () => isHeld.next(true),
    release: () => isHeld.next(false),
    layoutsStarted: () => layoutsStarted,
  }
}

/** Settings a test may override, the pre-paginated manifest included. */
type TestReaderOptions = Partial<CreateReaderOptions>

/** A reader without the pagination enhancer: `pagination` is the core result. */
export const createTestReader = (options: TestReaderOptions = {}) =>
  track(
    navigationEnhancer(
      htmlEnhancer(layoutEnhancer(themeEnhancer(createReader))),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: resolvedResource,
      manifest: createPrePaginatedManifest(),
      ...options,
    }),
  )

/** A reader with the pagination enhancer: `pagination` is the enriched result. */
export const createEnhancedTestReader = (options: TestReaderOptions = {}) =>
  track(
    navigationEnhancer(
      htmlEnhancer(
        paginationEnhancer(layoutEnhancer(themeEnhancer(createReader))),
      ),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: resolvedResource,
      manifest: createPrePaginatedManifest(),
      ...options,
    }),
  )

/** A reader with the zoom enhancer, which transforms the viewport. */
export const createZoomableTestReader = (options: TestReaderOptions = {}) =>
  track(
    zoomEnhancer(
      navigationEnhancer(
        htmlEnhancer(layoutEnhancer(themeEnhancer(createReader))),
      ),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: resolvedResource,
      manifest: createPrePaginatedManifest(),
      ...options,
    }),
  )

/**
 * Stubs what jsdom lacks, gives each test a container, and destroys every
 * reader a test created. Call once at the top of a test file.
 */
export const installReaderTestEnvironment = () => {
  window.__PROSE_READER_DEBUG = false

  beforeAll(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver)
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => viewport.width,
    })
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => viewport.height,
    })
  })

  afterAll(() => vi.unstubAllGlobals())

  beforeEach(() => {
    const element = document.createElement("div")
    element.id = "test-container"
    document.body.appendChild(element)
  })

  afterEach(() => {
    for (const reader of createdReaders.splice(0)) reader.destroy()
    document.getElementById("test-container")?.remove()
    viewport = { ...defaultViewport }
    watchingResizeObservers.clear()
    createdResizeObservers = 0
  })
}

/**
 * The size every element reports, for the current test. Portrait by default;
 * a landscape size turns the pre-paginated manifest into a spread.
 */
export const setTestViewport = (size: { width: number; height: number }) => {
  viewport = { ...size }
}

export const mountTestReader = (reader: {
  mount: (element: HTMLElement) => unknown
}) => {
  const container = document.getElementById("test-container")

  if (!container) throw new Error("installReaderTestEnvironment() did not run")

  reader.mount(container)
}

/**
 * The first settled result, optionally only once it is on the given item.
 * Resolves with the settled variant, so its positions need no narrowing.
 */
export const settledOn = <
  TState extends { isSettled: boolean; begin: { spineItemIndex?: number } },
>(
  reader: { pagination: { state$: Observable<TState> } },
  spineItemIndex?: number,
) =>
  firstValueFrom(
    reader.pagination.state$.pipe(
      filter(
        (state): state is Extract<TState, { isSettled: true }> =>
          state.isSettled,
      ),
      filter(
        (state) =>
          spineItemIndex === undefined ||
          state.begin.spineItemIndex === spineItemIndex,
      ),
      timeout(2000),
    ),
  )
