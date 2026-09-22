// @vitest-environment jsdom
import type { Manifest } from "@prose-reader/shared"
import { filter, firstValueFrom, of, skip, timeout } from "rxjs"
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
import { htmlEnhancer } from "../enhancers/html/enhancer"
import { layoutEnhancer } from "../enhancers/layout/layoutEnhancer"
import { navigationEnhancer } from "../enhancers/navigation"
import { paginationEnhancer } from "../enhancers/pagination/enhancer"
import { themeEnhancer } from "../enhancers/theme"
import { createReader } from "../reader"
import { DefaultRenderer } from "../spineItem/renderer/DefaultRenderer"
import type { PaginationInfo } from "./types"

window.__PROSE_READER_DEBUG = false

const BASE_MANIFEST: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: [],
  title: "",
}

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
  document.getElementById("test-container")?.remove()
})

const createTestReader = () =>
  navigationEnhancer(htmlEnhancer(layoutEnhancer(themeEnhancer(createReader))))(
    {
      getRenderer: () => (props) => new DefaultRenderer(props),
      getResource: () => of(new Response("", { status: 200 })),
      manifest: {
        ...BASE_MANIFEST,
        spineItems: [0, 1].map((index) => ({
          href: `/page_${index}.jpg`,
          id: `${index}`,
          pageSpreadLeft: true,
          pageSpreadRight: true,
          progressionWeight: 0.5,
          renditionLayout: "pre-paginated",
          index,
        })),
      },
    },
  )

const createEnhancedReader = () =>
  navigationEnhancer(
    htmlEnhancer(
      paginationEnhancer(layoutEnhancer(themeEnhancer(createReader))),
    ),
  )({
    getRenderer: () => (props) => new DefaultRenderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    manifest: {
      ...BASE_MANIFEST,
      spineItems: [0, 1].map((index) => ({
        href: `/page_${index}.jpg`,
        id: `${index}`,
        pageSpreadLeft: true,
        pageSpreadRight: true,
        progressionWeight: 0.5,
        renditionLayout: "pre-paginated",
        index,
      })),
    },
  })

const mount = (reader: ReturnType<typeof createTestReader>) => {
  // biome-ignore lint/style/noNonNullAssertion: test
  reader.mount(document.getElementById("test-container")!)
}

const settled = (reader: ReturnType<typeof createTestReader>) =>
  firstValueFrom(
    reader.pagination.state$.pipe(
      filter((state) => state.isSettled),
      timeout(2000),
    ),
  )

describe("pagination settlement", () => {
  it("starts provisional and settles on a position for the ready item", async () => {
    const reader = createTestReader()

    expect(reader.pagination.state.isSettled).toBe(false)

    mount(reader)

    const state = await settled(reader)

    expect(state.isSettled).toBe(true)
    expect(reader.spineItemsManager.items[0]?.value.isReady).toBe(true)
    /**
     * The settled variant guarantees positions, so no narrowing is needed to
     * read them. A completed pre-paginated item legitimately resolves to its
     * root cfi; what settlement rules out is a root cfi standing in for content
     * that has not loaded.
     */
    expect(reader.cfi.parseCfi(state.begin.cfi).itemIndex).toBe(0)

    reader.destroy()
  })

  it("never settles while the visible content is not ready", async () => {
    const reader = createTestReader()

    const samples: { isSettled: boolean; beginIsReady: boolean }[] = []
    reader.pagination.state$.subscribe((state) => {
      samples.push({
        isSettled: state.isSettled,
        beginIsReady:
          reader.spineItemsManager.get(state.begin.spineItemIndex)?.value
            .isReady ?? false,
      })
    })

    mount(reader)
    await settled(reader)

    expect(
      samples.filter(
        ({ isSettled, beginIsReady }) => isSettled && !beginIsReady,
      ),
    ).toEqual([])

    reader.destroy()
  })

  it("ends settlement when a navigation starts, before the next result resolves", async () => {
    const reader = createTestReader()

    mount(reader)
    await settled(reader)

    const states: PaginationInfo[] = []
    // skip the replayed current result
    reader.pagination.state$
      .pipe(skip(1))
      .subscribe((state) => states.push(state))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    // The withdrawal is the first thing published for the request, ahead of
    // any result for the new page, however quickly that result follows.
    expect(states[0]?.isSettled).toBe(false)

    const next = await settled(reader)

    expect(next.begin.spineItemIndex).toBe(1)

    reader.destroy()
  })

  it("does not resolve again when a result anchors the navigation", async () => {
    const reader = createTestReader()

    mount(reader)
    await settled(reader)

    const states: PaginationInfo[] = []
    reader.pagination.state$
      .pipe(skip(1))
      .subscribe((state) => states.push(state))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    await firstValueFrom(
      reader.pagination.state$.pipe(
        filter((state) => state.isSettled && state.begin.spineItemIndex === 1),
        timeout(2000),
      ),
    )
    await new Promise((resolve) => setTimeout(resolve, 50))

    /**
     * A settled result anchors the navigation, and the anchored entry comes
     * back through the navigation stream. It is not a trigger: resolving on it
     * would withdraw and re-grant settlement over nothing.
     */
    const firstSettled = states.findIndex(
      (state) => state.isSettled && state.begin.spineItemIndex === 1,
    )

    expect(states.slice(firstSettled + 1)).toEqual([])

    reader.destroy()
  })

  it("ends settlement when a layout is requested, not when it completes", async () => {
    const reader = createTestReader()

    mount(reader)
    await settled(reader)

    expect(reader.pagination.state.isSettled).toBe(true)

    reader.layout()

    /**
     * Item layout is debounced and `spine.layout$` only reports a layout that
     * finished, so waiting for either would leave the current result standing
     * over a spine that is already being re-laid out.
     */
    expect(reader.pagination.state.isSettled).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(reader.pagination.state.isSettled).toBe(false)

    // It comes back once the relayout has produced a result.
    const next = await settled(reader)

    expect(next.isSettled).toBe(true)

    reader.destroy()
  })

  it("never republishes a previous page as settled after moving on", async () => {
    const reader = createEnhancedReader()

    // biome-ignore lint/style/noNonNullAssertion: test
    reader.mount(document.getElementById("test-container")!)

    await firstValueFrom(
      reader.pagination.state$.pipe(
        filter((state) => state.isSettled),
        timeout(2000),
      ),
    )

    const settledItems: (number | undefined)[] = []
    // skip the replayed current result, which is legitimately item 0
    reader.pagination.state$.pipe(skip(1)).subscribe((state) => {
      if (state.isSettled) settledItems.push(state.begin.spineItemIndex)
    })

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    await new Promise((resolve) => setTimeout(resolve, 100))

    /**
     * Enrichment is throttled, so one built for item 0 can arrive after the
     * reader has moved to item 1. Publishing it as settled would present the
     * previous page's position as the current one.
     */
    expect(settledItems.filter((index) => index === 0)).toEqual([])

    reader.destroy()
  })

  it("withdraws enriched settlement as soon as the core result does", async () => {
    const reader = createEnhancedReader()

    // biome-ignore lint/style/noNonNullAssertion: test
    reader.mount(document.getElementById("test-container")!)

    await firstValueFrom(
      reader.pagination.state$.pipe(
        filter((state) => state.isSettled),
        timeout(2000),
      ),
    )

    const states: boolean[] = []
    reader.pagination.state$.subscribe((state) => states.push(state.isSettled))

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })

    // Throttling delays the enriched replacement, not the withdrawal: the
    // enriched result cannot keep claiming a settlement the core has dropped.
    expect(reader.pagination.state.isSettled).toBe(false)
    expect(states.at(-1)).toBe(false)

    reader.destroy()
  })
})
