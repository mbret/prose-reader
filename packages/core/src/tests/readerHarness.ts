import type { Manifest } from "@prose-reader/shared"
import { filter, firstValueFrom, type Observable, of, timeout } from "rxjs"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"
import { htmlEnhancer } from "../enhancers/html/enhancer"
import { layoutEnhancer } from "../enhancers/layout/layoutEnhancer"
import { navigationEnhancer } from "../enhancers/navigation"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import { themeEnhancer } from "../enhancers/theme"
import { createReader } from "../reader"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
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

const track = <TReader extends { destroy: () => void }>(reader: TReader) => {
  createdReaders.push(reader)

  return reader
}

/** A reader without the pagination enhancer: `pagination` is the core result. */
export const createTestReader = () =>
  track(
    navigationEnhancer(
      htmlEnhancer(layoutEnhancer(themeEnhancer(createReader))),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: () => of(new Response("", { status: 200 })),
      manifest: createPrePaginatedManifest(),
    }),
  )

/** A reader with the pagination enhancer: `pagination` is the enriched result. */
export const createEnhancedTestReader = () =>
  track(
    navigationEnhancer(
      htmlEnhancer(
        paginationEnhancer(layoutEnhancer(themeEnhancer(createReader))),
      ),
    )({
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: () => of(new Response("", { status: 200 })),
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 100,
    })
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 200,
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
  })
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
