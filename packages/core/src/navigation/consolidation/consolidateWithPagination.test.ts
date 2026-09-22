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
import { htmlEnhancer } from "../../enhancers/html/enhancer"
import { layoutEnhancer } from "../../enhancers/layout/layoutEnhancer"
import { navigationEnhancer } from "../../enhancers/navigation"
import { themeEnhancer } from "../../enhancers/theme"
import { createReader } from "../../reader"
import { DefaultRenderer } from "../../spineItem/renderer/DefaultRenderer"

window.__PROSE_READER_DEBUG = false

const MANIFEST: Manifest = {
  filename: "",
  items: [],
  readingDirection: "ltr",
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
      manifest: MANIFEST,
    },
  )

const settledOn = (
  reader: ReturnType<typeof createTestReader>,
  spineItemIndex: number,
) =>
  firstValueFrom(
    reader.pagination.state$.pipe(
      filter(
        (state) =>
          state.isSettled && state.begin.spineItemIndex === spineItemIndex,
      ),
      timeout(2000),
    ),
  )

describe("navigation consolidation with pagination", () => {
  it("anchors the navigation only on settled positions", async () => {
    const reader = createTestReader()
    const anchors: { cfi: string | undefined; fromSettledResult: boolean }[] =
      []

    reader.navigation.internalNavigator.navigationSubject.subscribe((entry) => {
      if (entry.meta.triggeredBy !== "pagination") return

      const { isSettled, begin } = reader.pagination.state

      anchors.push({
        cfi: entry.paginationBeginCfi,
        fromSettledResult: isSettled && begin.cfi === entry.paginationBeginCfi,
      })
    })

    // biome-ignore lint/style/noNonNullAssertion: test
    reader.mount(document.getElementById("test-container")!)
    await settledOn(reader, 0)

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await settledOn(reader, 1)

    /**
     * A provisional result stands in with the item start, so anchoring on one
     * would restore the reader to the top of the item.
     */
    expect(
      anchors.filter(({ fromSettledResult }) => !fromSettledResult),
    ).toEqual([])
    expect(
      anchors.map(({ cfi }) => cfi && reader.cfi.parseCfi(cfi).itemIndex),
    ).toEqual([0, 1])

    reader.destroy()
  })
})
