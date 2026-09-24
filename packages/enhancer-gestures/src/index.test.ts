// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
  type Navigation,
} from "@prose-reader/core"
import { EMPTY, filter, of, skip } from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { gesturesEnhancer } from "./index"

/**
 * Drives the enhancer on a mounted reader with the pointer events a browser
 * delivers. The test holds the clock, and runs whatever the reader schedules
 * until none is left, so what a gesture has not done by then it never does.
 */

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

/** Two single pages, so what is visible is unambiguous. */
const manifest: Manifest = {
  filename: "test",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.jpg`,
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

/**
 * jsdom has no DOMMatrix either, and a pan reads the viewport's translation
 * with one. The reader only ever writes `translate(<x>px, <y>px)`, which jsdom
 * hands back as is, so this reads that and refuses anything else.
 */
class TranslationMatrix {
  readonly e: number
  readonly f: number

  constructor(transform: string) {
    const match = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\)$/.exec(transform)

    if (!match) throw new Error(`Unexpected transform: ${transform}`)

    this.e = Number(match[1])
    this.f = Number(match[2])
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", InertObserver)
  vi.stubGlobal("IntersectionObserver", InertObserver)
  vi.stubGlobal("DOMMatrix", TranslationMatrix)
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
 * A reader settled on its first page, recording every user navigation and
 * gesture from then on.
 */
const onFirstPage = async () => {
  vi.useFakeTimers()

  const reader = gesturesEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new EmptyRenderer(props),
    getResource: () => of(new Response("", { status: 200 })),
  })
  readers.push(reader)

  const container = document.createElement("div")
  document.body.appendChild(container)
  reader.mount(container)
  await vi.runAllTimersAsync()

  expect(reader.pagination.state).toMatchObject({
    isSettled: true,
    begin: { spineItemIndex: 0 },
  })

  const navigations: Navigation[] = []
  reader.navigation.navigation$
    .pipe(
      // skip the replayed current one
      skip(1),
      filter((navigation) => navigation.triggeredBy === "user"),
    )
    .subscribe((navigation) => navigations.push(navigation))

  const gestures: { type: string; handled?: boolean }[] = []
  reader.gestures.gestures$.subscribe((gesture) => {
    gestures.push(
      gesture.type === "tap"
        ? { type: gesture.type, handled: gesture.handled }
        : { type: gesture.type },
    )
  })

  /**
   * Presses at `x`, halfway down, moves `distance` to the right in five steps
   * a frame apart, and lets go. It is over within the time a tap allows.
   */
  const drag = async ({ x, distance }: { x: number; distance: number }) => {
    const target = reader.context.value.rootElement

    if (!target) throw new Error("the reader is not mounted")

    const y = viewport.height / 2
    const dispatch = (type: string, clientX: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          isPrimary: true,
          pointerType: "mouse",
          clientX,
          clientY: y,
          bubbles: true,
          cancelable: true,
        }),
      )

    dispatch("pointerdown", x)

    for (let step = 1; step <= 5; step++) {
      await vi.advanceTimersByTimeAsync(16)
      dispatch("pointermove", x + (distance * step) / 5)
    }

    await vi.advanceTimersByTimeAsync(16)
    dispatch("pointerup", x + distance)

    await vi.runAllTimersAsync()
  }

  return { reader, navigations, gestures, drag }
}

describe("Given a reader on its first page", () => {
  /**
   * Moving right on the first page pans towards a page before the first one,
   * so a pan that started here would navigate out of the book.
   */
  it("does not navigate for a drag shorter than the pan threshold, away from the page turn margins", async () => {
    const { reader, navigations, gestures, drag } = await onFirstPage()

    await drag({ x: viewport.width / 2, distance: 5 })

    // The gesture was recognized, as a tap and not as a pan.
    expect(gestures).toEqual([{ type: "tap", handled: false }])
    expect(navigations).toEqual([])
    expect(reader.pagination.state).toMatchObject({
      isSettled: true,
      begin: { spineItemIndex: 0 },
    })
  })

  // Without this one, the test above would pass for a drag that could never
  // start a pan, or a harness that never sees a navigation.
  it("pans for a drag from the same place past the pan threshold", async () => {
    const { navigations, gestures, drag } = await onFirstPage()

    await drag({ x: viewport.width / 2, distance: 30 })

    expect(gestures.map(({ type }) => type)).toContain("pan")
    expect(navigations.length).toBeGreaterThan(0)
  })
})
