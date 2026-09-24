import type { Manifest } from "@prose-reader/shared"
import {
  BehaviorSubject,
  filter,
  first,
  firstValueFrom,
  ignoreElements,
  map,
  type Observable,
  of,
  ReplaySubject,
  timeout,
} from "rxjs"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { htmlEnhancer } from "../enhancers/html/enhancer"
import { layoutEnhancer } from "../enhancers/layout/layoutEnhancer"
import { navigationEnhancer } from "../enhancers/navigation"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import { themeEnhancer } from "../enhancers/theme"
import { type CreateReaderOptions, createReader } from "../reader"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
import type { DocumentRendererParams } from "../spineItem/renderer/DocumentRenderer"
import { createTestManifest } from "./utils"

/**
 * Drives a real reader in jsdom, with the real renderer, for tests about the
 * in-between states a fixture cannot reproduce.
 */

/** Two pre-paginated items, one page each, so what is visible is unambiguous. */
const createPrePaginatedManifest = (): Manifest =>
  createTestManifest({
    renditionLayout: "pre-paginated",
    renditionSpread: "auto",
    spineItems: [0, 1].map((index) => ({
      href: `/page_${index}.jpg`,
      id: `${index}`,
      pageSpreadLeft: true,
      pageSpreadRight: true,
      progressionWeight: 0.5,
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
 * Keeps one item from becoming ready: its renderer finishes loading only when
 * `release` is called. Everything else runs as usual, so the item is loading
 * for exactly as long as the test needs.
 */
export const holdItem = (href: string) => {
  const released = new ReplaySubject<void>(1)

  class HeldRenderer extends DefaultRenderer {
    /** Loads nothing, and completes when released. */
    onLoadDocument() {
      return released.pipe(first(), ignoreElements())
    }
  }

  return {
    getRenderer:
      (item: Manifest["spineItems"][number]) =>
      (props: DocumentRendererParams) =>
        item.href === href
          ? new HeldRenderer(props)
          : new DefaultRenderer(props),
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

/** Settings a test may override, on top of the pre-paginated manifest. */
type TestReaderOptions = Omit<CreateReaderOptions, "manifest">

/** A reader without the pagination enhancer: `pagination` is the core result. */
export const createTestReader = (options: TestReaderOptions = {}) =>
  track(
    navigationEnhancer(
      htmlEnhancer(layoutEnhancer(themeEnhancer(createReader))),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: resolvedResource,
      ...options,
      manifest: createPrePaginatedManifest(),
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
      ...options,
      manifest: createPrePaginatedManifest(),
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
