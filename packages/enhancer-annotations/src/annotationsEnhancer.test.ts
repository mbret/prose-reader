// @vitest-environment jsdom
import {
  createReader,
  DocumentRenderer,
  type Manifest,
} from "@prose-reader/core"
import {
  BehaviorSubject,
  EMPTY,
  first,
  map,
  type Observable,
  of,
  type Subscription,
} from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { annotationsEnhancer } from "./annotationsEnhancer.ts"
import type { Annotation } from "./types.ts"

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
const subscriptions: Subscription[] = []

afterEach(() => {
  for (const subscription of subscriptions.splice(0)) subscription.unsubscribe()
  for (const reader of readers.splice(0)) reader.destroy()
  document.body.replaceChildren()
  vi.useRealTimers()
})

const mountAnnotationsReader = async ({
  Renderer = EmptyRenderer,
  annotations$,
}: {
  Renderer?: typeof EmptyRenderer
  annotations$?: Observable<Annotation[]>
} = {}) => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    annotations: { annotations$ },
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
    const reader = await mountAnnotationsReader({
      Renderer: layoutHold.Renderer,
    })

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

/**
 * The ids of the annotations that have a highlight in each spine item, in
 * the order of the items. A highlight has its element from its creation, so
 * jsdom, which draws no rectangle, still shows it.
 */
const getHighlightedAnnotationIdsBySpineItem = (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
) =>
  reader.spineItemsManager.items.map((spineItem) =>
    Array.from(
      spineItem.containerElement.querySelectorAll<HTMLElement>(
        "[data-highlight-container]",
      ),
      (highlightElement) => highlightElement.dataset.highlightContainer,
    ),
  )

/** An annotation over the whole of a spine item. */
const createAnnotationOfSpineItem = (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
  spineItemIndex: number,
  id: string,
): Annotation => {
  const spineItem = reader.spineItemsManager.get(spineItemIndex)

  if (!spineItem) throw new Error(`no spine item ${spineItemIndex}`)

  return { id, cfi: reader.cfi.generateRootCfi(spineItem.item) }
}

/**
 * The highlights do not depend on whether the app observes the taps on them:
 * react-reader does, an app that only shows highlights does not.
 */
describe.each([{ appObservesTaps: false }, { appObservesTaps: true }])(
  "highlights, when the app observes taps: $appObservesTaps",
  ({ appObservesTaps }) => {
    /** A reader given no annotation, and the subject that gives it more. */
    const mountReaderWithAnnotationsSubject = async () => {
      const annotations$ = new BehaviorSubject<Annotation[]>([])
      const reader = await mountAnnotationsReader({ annotations$ })

      if (appObservesTaps) {
        subscriptions.push(reader.annotations.highlightTap$.subscribe())
      }

      expect(
        reader.spineItemsManager.items.map(
          (spineItem) => spineItem.value.loadStatus,
        ),
        "the load status of each spine item",
      ).toEqual(["loaded", "loaded"])

      return { reader, annotations$ }
    }

    it("keeps one highlight for each annotation of a spine item, as the list of annotations changes", async () => {
      const { reader, annotations$ } = await mountReaderWithAnnotationsSubject()
      const firstOfItem0 = createAnnotationOfSpineItem(reader, 0, "first-of-0")
      const secondOfItem0 = createAnnotationOfSpineItem(
        reader,
        0,
        "second-of-0",
      )
      const firstOfItem1 = createAnnotationOfSpineItem(reader, 1, "first-of-1")

      const successiveLists: Annotation[][] = [
        [firstOfItem0],
        [firstOfItem0, secondOfItem0, firstOfItem1],
        [
          { ...firstOfItem0, highlightColor: "red", notes: "a note" },
          firstOfItem1,
        ],
        [firstOfItem1],
        [],
      ]

      for (const annotations of successiveLists) {
        annotations$.next(annotations)
        await vi.runAllTimersAsync()

        expect(
          getHighlightedAnnotationIdsBySpineItem(reader),
          `the highlights of each spine item, for the annotations ${annotations.map(({ id }) => id).join(", ") || "none"}`,
        ).toEqual(
          reader.spineItemsManager.items.map((spineItem) =>
            annotations
              .filter(
                ({ cfi }) =>
                  reader.cfi.parseCfi(cfi).itemIndex === spineItem.index,
              )
              .map(({ id }) => id),
          ),
        )
      }
    })

    it("lets go of the annotations and removes every highlight once the reader is destroyed", async () => {
      const { reader, annotations$ } = await mountReaderWithAnnotationsSubject()

      annotations$.next([
        createAnnotationOfSpineItem(reader, 0, "of-0"),
        createAnnotationOfSpineItem(reader, 1, "of-1"),
      ])
      await vi.runAllTimersAsync()

      expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([
        ["of-0"],
        ["of-1"],
      ])

      reader.destroy()

      expect(
        annotations$.observed,
        "whether the reader still observes the annotations",
      ).toBe(false)
      expect(
        document.querySelectorAll("[data-highlight-container]"),
      ).toHaveLength(0)
    })
  },
)
