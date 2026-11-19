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
  Subject,
  type Subscription,
} from "rxjs"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { annotationsEnhancer } from "./annotationsEnhancer.ts"
import type { Annotation, AnnotationsEnhancerAPI } from "./types.ts"

type CreateAnnotationParams = Parameters<
  AnnotationsEnhancerAPI["annotations"]["createAnnotation"]
>[0]

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

  getDocumentFrame(): HTMLIFrameElement | undefined {
    return undefined
  }
}

/**
 * Renders each item as a text document in a frame, the way the html renderer
 * does, so that its text can be selected.
 */
class TextDocumentRenderer extends EmptyRenderer {
  onCreateDocument() {
    return of(this.context.document.createElement("iframe"))
  }

  onLoadDocument() {
    this.attach()

    const frameDocument = this.getDocumentFrame()?.contentDocument

    if (!frameDocument) throw new Error("the frame has no document")

    frameDocument.body.innerHTML = `<p>A paragraph of text.</p>`

    return EMPTY
  }

  getDocumentFrame() {
    const frame = this.documentContainer

    return frame instanceof HTMLIFrameElement ? frame : undefined
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
  mediaType: "application/epub+zip",
  title: "test",
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: "none",
  items: [],
  spineItems: [0, 1].map((index) => ({
    href: `/page_${index}.xhtml`,
    containerUri: `page_${index}.xhtml`,
    id: `${index}`,
    index,
    mediaType: "application/xhtml+xml",
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
  numberOfAdjacentSpineItemToPreLoad,
}: {
  Renderer?: typeof EmptyRenderer
  annotations$?: Observable<Annotation[]>
  numberOfAdjacentSpineItemToPreLoad?: number
} = {}) => {
  vi.useFakeTimers()

  const reader = annotationsEnhancer(createReader)({
    manifest,
    getRenderer: () => (props) => new Renderer(props),
    getResource: () => of(new Response("", { status: 200 })),
    annotations: { annotations$ },
    numberOfAdjacentSpineItemToPreLoad,
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

type AnnotationsReader = Awaited<ReturnType<typeof mountAnnotationsReader>>

/**
 * Reads the highlight elements, which exist from their creation. The empty
 * renderer gives no document to resolve a cfi into, so no rect is drawn here.
 */
const getHighlightElements = (container: Element, annotationId?: string) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(
      annotationId === undefined
        ? "[data-highlight-container]"
        : `[data-highlight-container="${annotationId}"]`,
    ),
  )

const getHighlightedAnnotationIdsBySpineItem = (reader: AnnotationsReader) =>
  reader.spineItemsManager.items.map((spineItem) =>
    getHighlightElements(spineItem.containerElement)
      .map((highlightElement) => highlightElement.dataset.highlightContainer)
      .sort(),
  )

const getSpineItem = (reader: AnnotationsReader, spineItemIndex: number) => {
  const spineItem = reader.spineItemsManager.get(spineItemIndex)

  if (!spineItem) throw new Error(`no spine item ${spineItemIndex}`)

  return spineItem
}

const createAnnotationAtRootOfSpineItem = (
  reader: AnnotationsReader,
  spineItemIndex: number,
  id: string,
): Annotation => ({
  id,
  cfi: reader.cfi.generateRootCfi(getSpineItem(reader, spineItemIndex).item),
})

const mountReaderWithAnnotationsSubject = async ({
  appObservesTaps,
}: {
  appObservesTaps: boolean
}) => {
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

/**
 * With no adjacent spine item preloaded, the reader holds the document of the
 * spine item it shows and no other: the first one, once mounted.
 */
const mountReaderHoldingOneDocument = async ({
  appObservesTaps,
  Renderer,
}: {
  appObservesTaps: boolean
  Renderer?: typeof EmptyRenderer
}) => {
  const annotations$ = new BehaviorSubject<Annotation[]>([])
  const reader = await mountAnnotationsReader({
    Renderer,
    annotations$,
    numberOfAdjacentSpineItemToPreLoad: 0,
  })

  if (appObservesTaps) {
    subscriptions.push(reader.annotations.highlightTap$.subscribe())
  }

  expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["loaded", "idle"])

  return { reader, annotations$ }
}

const getLoadStatusOfEachSpineItem = (reader: AnnotationsReader) =>
  reader.spineItemsManager.items.map((spineItem) => spineItem.value.loadStatus)

const goToSpineItem = async (reader: AnnotationsReader, indexOrId: number) => {
  reader.navigation.goToSpineItem({ indexOrId })
  await vi.runAllTimersAsync()
}

/** The annotations that `highlightTap$` emits from now on. */
const recordTappedAnnotations = (reader: AnnotationsReader) => {
  const tappedAnnotations: Annotation[] = []

  subscriptions.push(
    reader.annotations.highlightTap$.subscribe(({ annotation }) => {
      tappedAnnotations.push(annotation)
    }),
  )

  return tappedAnnotations
}

const tapHighlight = (
  reader: AnnotationsReader,
  spineItemIndex: number,
  annotationId: string,
) => {
  const [highlightElement] = getHighlightElements(
    getSpineItem(reader, spineItemIndex).containerElement,
    annotationId,
  )

  if (!highlightElement) {
    throw new Error(
      `no highlight of ${annotationId} in spine item ${spineItemIndex}`,
    )
  }

  highlightElement.dispatchEvent(new MouseEvent("click", { bubbles: true }))
}

/**
 * The highlights do not depend on whether the app observes the taps on them:
 * react-reader does, an app that only shows highlights does not.
 */
describe.each([{ appObservesTaps: false }, { appObservesTaps: true }])(
  "highlights, when the app observes taps: $appObservesTaps",
  ({ appObservesTaps }) => {
    it("has one highlight for each annotation of a spine item after each change of the list of annotations", async () => {
      const { reader, annotations$ } = await mountReaderWithAnnotationsSubject({
        appObservesTaps,
      })
      const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")
      const b0 = createAnnotationAtRootOfSpineItem(reader, 0, "b0")
      const a1 = createAnnotationAtRootOfSpineItem(reader, 1, "a1")
      const a0MovedToSpineItem1 = createAnnotationAtRootOfSpineItem(
        reader,
        1,
        "a0",
      )

      const steps: {
        annotations: Annotation[]
        highlightedAnnotationIdsBySpineItem: string[][]
      }[] = [
        {
          annotations: [a0],
          highlightedAnnotationIdsBySpineItem: [["a0"], []],
        },
        {
          annotations: [a0, b0, a1],
          highlightedAnnotationIdsBySpineItem: [["a0", "b0"], ["a1"]],
        },
        {
          annotations: [{ ...a0, highlightColor: "red", notes: "a note" }, a1],
          highlightedAnnotationIdsBySpineItem: [["a0"], ["a1"]],
        },
        {
          annotations: [a1, a0MovedToSpineItem1],
          highlightedAnnotationIdsBySpineItem: [[], ["a0", "a1"]],
        },
        {
          annotations: [a1, { ...a1, highlightColor: "red" }],
          highlightedAnnotationIdsBySpineItem: [[], ["a1"]],
        },
        { annotations: [], highlightedAnnotationIdsBySpineItem: [[], []] },
      ]

      for (const {
        annotations,
        highlightedAnnotationIdsBySpineItem,
      } of steps) {
        annotations$.next(annotations)
        await vi.runAllTimersAsync()

        expect(
          getHighlightedAnnotationIdsBySpineItem(reader),
          `the highlights of each spine item, for the annotations ${annotations.map(({ id }) => id).join(", ") || "none"}`,
        ).toEqual(highlightedAnnotationIdsBySpineItem)
      }
    })

    /**
     * A highlight made again would have no rect until the next render, so
     * each change of the list would make it blink.
     */
    it("keeps the element of a highlight when the entry of its annotation changes", async () => {
      const { reader, annotations$ } = await mountReaderWithAnnotationsSubject({
        appObservesTaps,
      })
      const spineItem0 = getSpineItem(reader, 0)
      const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")

      annotations$.next([a0])
      await vi.runAllTimersAsync()

      const [highlightElementBeforeChange] = getHighlightElements(
        spineItem0.containerElement,
        "a0",
      )

      expect(highlightElementBeforeChange).toBeDefined()

      annotations$.next([{ ...a0, highlightColor: "red" }])
      await vi.runAllTimersAsync()

      const highlightElementsAfterChange = getHighlightElements(
        spineItem0.containerElement,
        "a0",
      )

      expect(highlightElementsAfterChange).toHaveLength(1)
      expect(highlightElementsAfterChange[0]).toBe(highlightElementBeforeChange)
    })

    it("removes the highlights of a spine item whose document unloads, and makes them from the latest list when it loads again", async () => {
      const { reader, annotations$ } = await mountReaderHoldingOneDocument({
        appObservesTaps,
      })
      const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")
      const b0 = createAnnotationAtRootOfSpineItem(reader, 0, "b0")
      const a1 = createAnnotationAtRootOfSpineItem(reader, 1, "a1")

      annotations$.next([a0, a1])
      await vi.runAllTimersAsync()

      expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([
        ["a0"],
        [],
      ])

      await goToSpineItem(reader, 1)

      expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["idle", "loaded"])
      expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([
        [],
        ["a1"],
      ])

      annotations$.next([a0, b0, a1])
      await vi.runAllTimersAsync()
      await goToSpineItem(reader, 0)

      expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["loaded", "idle"])
      expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([
        ["a0", "b0"],
        [],
      ])
    })

    it("stops observing the annotations and removes every highlight once the reader is destroyed", async () => {
      const { reader, annotations$ } = await mountReaderWithAnnotationsSubject({
        appObservesTaps,
      })

      annotations$.next([
        createAnnotationAtRootOfSpineItem(reader, 0, "a0"),
        createAnnotationAtRootOfSpineItem(reader, 1, "a1"),
      ])
      await vi.runAllTimersAsync()

      expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([
        ["a0"],
        ["a1"],
      ])

      // The reader removes its spine items from the page as it is destroyed.
      const spineItemContainers = reader.spineItemsManager.items.map(
        (spineItem) => spineItem.containerElement,
      )

      reader.destroy()

      expect(
        annotations$.observed,
        "whether the reader still observes the annotations",
      ).toBe(false)
      expect(
        spineItemContainers.flatMap((container) =>
          getHighlightElements(container),
        ),
      ).toEqual([])
    })
  },
)

/**
 * An annotation over characters of the paragraph of a spine item that the
 * text renderer has loaded.
 */
const createAnnotationOverText = (
  reader: AnnotationsReader,
  {
    spineItemIndex,
    id,
    start,
    end,
  }: { spineItemIndex: number; id: string; start: number; end: number },
): Annotation => {
  const spineItem = getSpineItem(reader, spineItemIndex)
  const text = spineItem.loadedDocument?.querySelector("p")?.firstChild

  if (!text) throw new Error(`spine item ${spineItemIndex} has no text`)

  const range = text.ownerDocument?.createRange()

  if (!range) throw new Error("the text has no document")

  range.setStart(text, start)
  range.setEnd(text, end)

  return { id, cfi: reader.cfi.generateCfiFromRange(range, spineItem.item) }
}

/**
 * jsdom has no layout, and its ranges have no `getClientRects`. Gives each
 * range of the frame of a spine item one rect, so that a highlight draws.
 */
const giveRangesOfFrameOneRect = (
  reader: AnnotationsReader,
  spineItemIndex: number,
) => {
  const frameDocument = getSpineItem(
    reader,
    spineItemIndex,
  ).renderer.getDocumentFrame()?.contentDocument

  if (!frameDocument) {
    throw new Error(`spine item ${spineItemIndex} has no frame`)
  }

  Object.defineProperty(
    Object.getPrototypeOf(frameDocument.createRange()),
    "getClientRects",
    { configurable: true, value: () => [new DOMRect(0, 0, 10, 10)] },
  )
}

const getRectElementsOfHighlight = (
  reader: AnnotationsReader,
  spineItemIndex: number,
  annotationId: string,
) =>
  Array.from(
    getSpineItem(reader, spineItemIndex).containerElement.querySelectorAll(
      `[data-highlight-rect="${annotationId}"]`,
    ),
  )

/**
 * An app can give its annotations through a source that does not replay, once
 * the reader exists. The documents load later, and need that list.
 */
it("shows the annotations that a source with no replay gave before the documents loaded", async () => {
  const annotations$ = new Subject<Annotation[]>()
  const mountedReader = mountAnnotationsReader({ annotations$ })

  // A cfi of the first spine item, written by hand: the reader that would
  // make one is still mounting.
  annotations$.next([{ id: "a0", cfi: "epubcfi(/6/2!/4/2)" }])

  const reader = await mountedReader

  expect(getHighlightedAnnotationIdsBySpineItem(reader)).toEqual([["a0"], []])
})

describe("drawing", () => {
  /** The content of a loaded document does not change. */
  it("resolves the cfi of a highlight once per document, and again only when the cfi changes", async () => {
    const annotations$ = new BehaviorSubject<Annotation[]>([])
    const reader = await mountAnnotationsReader({
      Renderer: TextDocumentRenderer,
      annotations$,
    })

    giveRangesOfFrameOneRect(reader, 0)

    const resolveCfi = vi.spyOn(reader.cfi, "resolveCfi")
    const countResolutionsOf = (cfi: string) =>
      resolveCfi.mock.calls.filter(([params]) => params.cfi === cfi).length
    const annotation = createAnnotationOverText(reader, {
      spineItemIndex: 0,
      id: "a0",
      start: 2,
      end: 11,
    })
    const annotationOverOtherText = createAnnotationOverText(reader, {
      spineItemIndex: 0,
      id: "a0",
      start: 12,
      end: 16,
    })

    annotations$.next([annotation])
    await vi.runAllTimersAsync()

    const [rectElementOfFirstRender] = getRectElementsOfHighlight(
      reader,
      0,
      "a0",
    )

    expect(rectElementOfFirstRender).toBeDefined()

    annotations$.next([{ ...annotation, highlightColor: "red" }])
    await vi.runAllTimersAsync()
    reader.layout()
    await vi.runAllTimersAsync()

    const [rectElementOfLastRender] = getRectElementsOfHighlight(
      reader,
      0,
      "a0",
    )

    expect(
      rectElementOfLastRender,
      "the rect element of the last render, which draws a new one",
    ).not.toBe(rectElementOfFirstRender)
    expect(countResolutionsOf(annotation.cfi)).toBe(1)

    annotations$.next([annotationOverOtherText])
    await vi.runAllTimersAsync()

    expect(countResolutionsOf(annotationOverOtherText.cfi)).toBe(1)
    expect(getRectElementsOfHighlight(reader, 0, "a0")).toHaveLength(1)
  })

  /**
   * The highlights of a spine item are created while its document loads,
   * when no cfi resolves. A render in that time finds no range.
   */
  it("draws a highlight that rendered while its document loaded, once the document has loaded", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
      Renderer: TextDocumentRenderer,
    })

    // The cfi of a text of spine item 1 comes from its document.
    await goToSpineItem(reader, 1)

    const annotation = createAnnotationOverText(reader, {
      spineItemIndex: 1,
      id: "a1",
      start: 2,
      end: 11,
    })

    await goToSpineItem(reader, 0)

    expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["loaded", "idle"])

    let letLoadFinish = () => {}
    const loadMayFinish = new Promise<void>((resolve) => {
      letLoadFinish = resolve
    })

    reader.hookManager.register("item.onDocumentLoad", async ({ itemId }) => {
      if (itemId !== getSpineItem(reader, 1).item.id) return

      giveRangesOfFrameOneRect(reader, 1)
      await loadMayFinish
    })

    const resolveCfi = vi.spyOn(reader.cfi, "resolveCfi")

    annotations$.next([annotation])
    reader.navigation.goToSpineItem({ indexOrId: 1 })
    await vi.runAllTimersAsync()
    reader.layout()
    await vi.runAllTimersAsync()

    expect(getSpineItem(reader, 1).value.loadStatus).toBe("loading")
    expect(
      resolveCfi.mock.calls.some(([params]) => params.cfi === annotation.cfi),
      "whether the highlight rendered while its document loaded",
    ).toBe(true)
    expect(getRectElementsOfHighlight(reader, 1, "a1")).toHaveLength(0)

    letLoadFinish()
    await vi.runAllTimersAsync()

    expect(getSpineItem(reader, 1).value.loadStatus).toBe("loaded")
    expect(getRectElementsOfHighlight(reader, 1, "a1")).toHaveLength(1)
  })
})

describe("highlightTap$", () => {
  it("completes when the reader is destroyed", async () => {
    const { reader } = await mountReaderWithAnnotationsSubject({
      appObservesTaps: false,
    })
    const highlightTapSubscription =
      reader.annotations.highlightTap$.subscribe()

    subscriptions.push(highlightTapSubscription)
    reader.destroy()

    expect(highlightTapSubscription.closed).toBe(true)
  })

  it("emits the annotation of the tapped highlight, as the latest list gives it", async () => {
    const { reader, annotations$ } = await mountReaderWithAnnotationsSubject({
      appObservesTaps: false,
    })
    const tappedAnnotations = recordTappedAnnotations(reader)
    const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")

    annotations$.next([a0])
    await vi.runAllTimersAsync()
    annotations$.next([{ ...a0, notes: "a note" }])
    await vi.runAllTimersAsync()

    tapHighlight(reader, 0, "a0")

    expect(tappedAnnotations).toEqual([
      { ...a0, notes: "a note", itemIndex: 0 },
    ])
  })

  it("emits the last entry of an id that the list holds more than once", async () => {
    const { reader, annotations$ } = await mountReaderWithAnnotationsSubject({
      appObservesTaps: false,
    })
    const tappedAnnotations = recordTappedAnnotations(reader)
    const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")

    annotations$.next([
      { ...a0, notes: "first entry" },
      { ...a0, notes: "last entry" },
    ])
    await vi.runAllTimersAsync()

    tapHighlight(reader, 0, "a0")

    expect(tappedAnnotations).toEqual([
      { ...a0, notes: "last entry", itemIndex: 0 },
    ])
  })

  it("emits the taps on the highlights of a spine item whose document loads after the subscription", async () => {
    const { reader, annotations$ } = await mountReaderHoldingOneDocument({
      appObservesTaps: false,
    })
    const tappedAnnotations = recordTappedAnnotations(reader)
    const a0 = createAnnotationAtRootOfSpineItem(reader, 0, "a0")
    const b0 = createAnnotationAtRootOfSpineItem(reader, 0, "b0")
    const a1 = createAnnotationAtRootOfSpineItem(reader, 1, "a1")

    annotations$.next([a0, a1])
    await vi.runAllTimersAsync()
    await goToSpineItem(reader, 1)

    expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["idle", "loaded"])

    tapHighlight(reader, 1, "a1")

    annotations$.next([a0, b0, a1])
    await vi.runAllTimersAsync()
    await goToSpineItem(reader, 0)

    expect(getLoadStatusOfEachSpineItem(reader)).toEqual(["loaded", "idle"])

    tapHighlight(reader, 0, "b0")

    expect(tappedAnnotations).toEqual([
      { ...a1, itemIndex: 1 },
      { ...b0, itemIndex: 0 },
    ])
  })
})

/**
 * Selects text in the document of an item and releases the pointer, as a user
 * does. The reader then holds the selection, the event that ended it and the
 * item, in `reader.selection.getSelection()`.
 */
const selectTextAndRelease = async (
  reader: Awaited<ReturnType<typeof mountAnnotationsReader>>,
  itemIndex: number,
) => {
  const frameDocument = reader.spineItemsManager
    .get(itemIndex)
    ?.renderer.getDocumentFrame()?.contentDocument
  const frameWindow = frameDocument?.defaultView
  const text = frameDocument?.querySelector("p")?.firstChild

  if (!frameDocument || !frameWindow || !text) {
    throw new Error(`item ${itemIndex} has no text to select`)
  }

  frameDocument.getSelection()?.setBaseAndExtent(text, 2, text, 11)
  frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerdown"))
  frameDocument.dispatchEvent(new frameWindow.PointerEvent("pointerup"))
  await vi.runAllTimersAsync()

  const selection = reader.selection.getSelection()

  if (selection?.type !== "over") {
    throw new Error("the reader holds no released selection")
  }

  return selection
}

/**
 * An app stores what `createAnnotation` returns, in IndexedDB or through
 * `postMessage`, which copy a value with the structured clone algorithm. A
 * browser cannot clone an event or a selection, so the result holds an id
 * and a cfi only.
 *
 * The tests compare the keys of the result, not whether it clones: jsdom
 * clones its events like plain objects, so a clone would succeed here with
 * the event in the result.
 */
describe("createAnnotation", () => {
  it("annotates a selection with its id and a range cfi, and nothing of the selection itself", async () => {
    const reader = await mountAnnotationsReader({
      Renderer: TextDocumentRenderer,
    })
    // The whole value the reader holds, event included, as an app may pass it.
    const selection = await selectTextAndRelease(reader, 0)

    const annotation = reader.annotations.createAnnotation(selection)

    expect(annotation).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
    })
    expect(reader.cfi.parseCfi(annotation?.cfi ?? "")).toMatchObject({
      itemIndex: 0,
      isCfiRange: true,
    })
  })

  it("annotates a page with its id and the cfi of its item, and not the page index", async () => {
    const reader = await mountAnnotationsReader({
      Renderer: TextDocumentRenderer,
    })

    const annotation = reader.annotations.createAnnotation({
      absolutePageIndex: 1,
    })

    expect(annotation).toStrictEqual({
      id: expect.any(String),
      cfi: expect.any(String),
    })
    expect(reader.cfi.parseCfi(annotation?.cfi ?? "")).toMatchObject({
      itemIndex: 1,
      isCfiRange: false,
    })
  })

  /**
   * The selection the reader holds is the live one of the document. The user
   * can clear it before the app annotates it.
   */
  it("takes a selection with its spine item, or a page, and nothing between", () => {
    const selection = document.getSelection()

    if (!selection) throw new Error("the document has no selection")

    const ofSelection: CreateAnnotationParams = { itemIndex: 0, selection }
    const ofPage: CreateAnnotationParams = { absolutePageIndex: 0 }
    // @ts-expect-error a page with a selection is neither form
    const ofPageWithSelection: CreateAnnotationParams = {
      absolutePageIndex: 0,
      selection,
    }
    // @ts-expect-error a spine item with no selection is neither form
    const ofItem: CreateAnnotationParams = { itemIndex: 0 }

    // The type check is the test: the values only exist to be checked.
    expect([ofSelection, ofPage, ofPageWithSelection, ofItem]).toHaveLength(4)
  })

  it("annotates nothing when the selection holds no range", async () => {
    const reader = await mountAnnotationsReader({
      Renderer: TextDocumentRenderer,
    })
    const selected = await selectTextAndRelease(reader, 0)

    selected.selection.removeAllRanges()

    expect(reader.annotations.createAnnotation(selected)).toBeUndefined()
  })
})
