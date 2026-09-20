// @vitest-environment jsdom
import type { Manifest } from "@prose-reader/shared"
import { filter, firstValueFrom, of, timeout } from "rxjs"
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
import { themeEnhancer } from "../enhancers/theme"
import { createReader } from "../reader"
import { DefaultRenderer } from "./renderer/DefaultRenderer"

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
        spineItems: [
          {
            href: "/page_1.jpg",
            id: "1",
            pageSpreadLeft: true,
            pageSpreadRight: true,
            progressionWeight: 1,
            renditionLayout: "pre-paginated",
            index: 0,
          },
        ],
      },
    },
  )

describe("SpineItem readiness", () => {
  it("never reports readiness without a loaded document", async () => {
    const reader = createTestReader()

    const item = reader.spineItemsManager.items[0]
    if (!item) throw new Error("expected a spine item")

    const samples: { isLoaded: boolean; isReady: boolean }[] = []
    item.subscribe(({ isLoaded, isReady }) =>
      samples.push({ isLoaded, isReady }),
    )

    // biome-ignore lint/style/noNonNullAssertion: test
    reader.mount(document.getElementById("test-container")!)

    await firstValueFrom(item.isReady$.pipe(filter(Boolean), timeout(2000)))

    const violations = () =>
      samples.filter(({ isLoaded, isReady }) => isReady && !isLoaded)

    expect(violations()).toEqual([])
    expect(item.value.isReady).toBe(true)
    expect(item.value.isLoaded).toBe(true)

    // Losing the document ends readiness at once, rather than leaving it
    // standing until some later layout happens to recompute it.
    item.unload()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(item.value.isLoaded).toBe(false)
    expect(item.value.isReady).toBe(false)

    // The invariant itself, across every state the item went through.
    expect(violations()).toEqual([])

    reader.destroy()
  })
})
