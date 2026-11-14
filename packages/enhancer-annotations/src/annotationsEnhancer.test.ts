// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import { BehaviorSubject, EMPTY, first, map, of } from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { annotationsEnhancer } from "./annotationsEnhancer"

/** jsdom has no layout, so every element reports this size. */
const viewport = { width: 400, height: 600 }

/** Renders each item as an empty element, so it is ready once loaded. */
class EmptyRenderer extends DocumentRenderer {
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

/**
 * Holds every layout while held, so that the spine publishes no pages until
 * it is released.
 */
const createLayoutHold = () => {
  const isLayoutHeld = new BehaviorSubject(true)

  class HeldLayoutRenderer extends EmptyRenderer {
    onLayout() {
      return isLayoutHeld.pipe(
        first((isHeld) => !isHeld),
        map(() => undefined),
      )
    }
  }

  return {
    Renderer: HeldLayoutRenderer,
    release: () => isLayoutHeld.next(false),
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

const mountAnnotationsReader = async (
  Renderer: typeof EmptyRenderer = EmptyRenderer,
) => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
  })
  readers.push(reader)

  const container = document.createElement("div")
  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  return reader
}

/** Records what `candidates$` emits, from one subscription. */
const observeCandidates = (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
) => {
  const emissions: boolean[][] = []

  reader.annotations.candidates$.subscribe((candidates) =>
    emissions.push(candidates),
  )

  return emissions
}

describe("candidates$", () => {
  /**
   * Until the first layout ends, the reader has published no pages. A
   * consumer that reads the candidates with `withLatestFrom`, as react-reader's
   * bookmark hook does, needs a value then: from a stream that has emitted
   * nothing, it gets none, and gives no verdict.
   */
  it("emits an empty array while the reader has published no pages, then one candidate per page", async () => {
    const layoutHold = createLayoutHold()
    const reader = await mountAnnotationsReader(layoutHold.Renderer)

    expect(reader.spine.pages.value.pages).toEqual([])

    const emissions = observeCandidates(reader)

    expect(emissions).toEqual([[]])

    layoutHold.release()
    await vi.runAllTimersAsync()

    expect(emissions.at(-1)).toEqual([true, true])
  })

  it("gives one candidate per published page", async () => {
    const reader = await mountAnnotationsReader()

    expect(observeCandidates(reader)).toEqual([[true, true]])
  })
})
