// @vitest-environment jsdom
import type { Manifest } from "@prose-reader/shared"
import { of } from "rxjs"
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
import {
  HTML_ATTRIBUTE_DATA_READER_ID,
  HTML_PREFIX,
  HTML_PREFIX_SCROLL_NAVIGATOR,
} from "./constants"
import { createReader } from "./reader"
import { waitFor } from "./tests/utils"

window.__PROSE_READER_DEBUG = false

const CONTAINER_CLASS = `${HTML_PREFIX}-reader`
const CONTAINER_ATTRIBUTE = `data-prose-reader-container`

const MANIFEST: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "auto",
  spineItems: [
    {
      href: "/chapter_1/page_1.jpg",
      id: "1",
      pageSpreadLeft: true,
      pageSpreadRight: true,
      progressionWeight: 0,
      renditionLayout: "pre-paginated",
      index: 0,
    },
  ],
  title: "",
}

const createTestReader = () =>
  createReader({
    getResource: () => of(new Response("", { status: 200 })),
    manifest: MANIFEST,
  })

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterAll(() => {
  vi.unstubAllGlobals()
})

let container: HTMLElement

beforeEach(() => {
  container = document.createElement("div")
  container.id = "test-container"
  document.body.appendChild(container)
})

afterEach(() => {
  container.remove()
})

describe("Given a reader which is not mounted", () => {
  /**
   * Spine items exist from reader creation but rendering only starts at
   * mount: containers are still detached and users may register hooks
   * between `createReader()` and `mount()`.
   */
  it("does not load any spine item", async () => {
    const reader = createTestReader()

    const loadSpies = reader.spineItemsManager.items.map((item) =>
      vi.spyOn(item.renderer, "load"),
    )

    // longer than the spine items loader debounce
    await waitFor(200)

    expect(loadSpies.map((spy) => spy.mock.calls.length)).toEqual([0])

    reader.destroy()
  })
})

describe("Given a mounted reader", () => {
  it("loads visible spine items", async () => {
    const reader = createTestReader()

    const loadSpy = vi.spyOn(
      // biome-ignore lint/style/noNonNullAssertion: manifest has one item
      reader.spineItemsManager.items[0]!.renderer,
      "load",
    )

    reader.mount(container)

    // longer than the spine items loader debounce
    await waitFor(200)

    expect(loadSpy).toHaveBeenCalled()

    reader.destroy()
  })

  it("appends a single reader-owned subtree under the container", () => {
    const reader = createTestReader()

    reader.mount(container)

    expect(container.children).toHaveLength(1)
    expect(
      container.querySelector(`[data-${HTML_PREFIX_SCROLL_NAVIGATOR}]`)
        ?.parentElement,
    ).toBe(container)

    reader.destroy()
  })

  describe("when it is destroyed", () => {
    it("removes the reader-owned subtree and reverts the container", () => {
      const reader = createTestReader()

      reader.mount(container)
      reader.destroy()

      expect(container.children).toHaveLength(0)
      expect(container.classList.contains(CONTAINER_CLASS)).toBe(false)
      expect(container.hasAttribute(HTML_ATTRIBUTE_DATA_READER_ID)).toBe(false)
      expect(container.hasAttribute(CONTAINER_ATTRIBUTE)).toBe(false)
    })
  })

  describe("when another reader is mounted into the same container after destroy", () => {
    it("does not leave a stale subtree behind (React StrictMode / RN re-mount)", () => {
      const first = createTestReader()
      first.mount(container)
      first.destroy()

      const second = createTestReader()
      second.mount(container)

      expect(container.children).toHaveLength(1)

      second.destroy()
    })
  })
})
