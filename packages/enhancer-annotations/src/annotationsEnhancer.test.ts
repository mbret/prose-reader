// @vitest-environment jsdom
import { BehaviorSubject, EMPTY, first, map, of, Subject } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import {
  createCfiOfItem,
  EmptyRenderer,
  mountAnnotationsReader,
  readHighlightedAnnotationIds,
} from "./tests/readerHarness.ts"
import type { Annotation, AnnotationsEnhancerAPI } from "./types.ts"

type CreateAnnotationParams = Parameters<
  AnnotationsEnhancerAPI["annotations"]["createAnnotation"]
>[0]

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

describe("highlights", () => {
  const createAnnotationOfFirstItem = (id: string): Annotation => ({
    id,
    cfi: createCfiOfItem(0),
    highlightColor: "red",
  })

  /**
   * The highlights alive in the reader are the annotations of the list, at
   * every step, whether or not anything subscribes to `highlightTap$`: an app
   * that does not handle taps on highlights has no subscriber.
   */
  it.each([
    { highlightTapSubscriber: "no subscriber" },
    { highlightTapSubscriber: "a subscriber" },
  ])(
    "has one highlight per annotation of the list, with $highlightTapSubscriber to highlightTap$",
    async ({ highlightTapSubscriber }) => {
      const annotations$ = new BehaviorSubject<Annotation[]>([])
      const reader = await mountAnnotationsReader({ annotations$ })

      if (highlightTapSubscriber === "a subscriber") {
        const highlightTapSubscription =
          reader.annotations.highlightTap$.subscribe()

        onTestFinished(() => highlightTapSubscription.unsubscribe())
      }

      expect(reader.spineItemsManager.get(0)?.value.loadStatus).toBe("loaded")

      const listSteps = [
        ["first", "second"],
        ["second"],
        ["second", "third"],
        [],
      ]

      for (const ids of listSteps) {
        annotations$.next(ids.map(createAnnotationOfFirstItem))
        await vi.runAllTimersAsync()

        expect(readHighlightedAnnotationIds()).toEqual(ids)
      }
    },
  )

  /**
   * A highlight that stays keeps its drawing until the next one: a new
   * highlight shows nothing until the enhancer draws it.
   */
  it("keeps the highlight of an annotation while its cfi is the same, and replaces it when its cfi changes", async () => {
    const annotations$ = new BehaviorSubject<Annotation[]>([
      createAnnotationOfFirstItem("first"),
    ])
    await mountAnnotationsReader({ annotations$ })

    const readHighlightContainer = () =>
      document.querySelector(`[data-highlight-container="first"]`)
    const firstHighlightContainer = readHighlightContainer()

    expect(firstHighlightContainer).not.toBeNull()

    annotations$.next([
      {
        ...createAnnotationOfFirstItem("first"),
        highlightColor: "blue",
        notes: "A note",
      },
    ])
    await vi.runAllTimersAsync()

    expect(readHighlightContainer()).toBe(firstHighlightContainer)

    annotations$.next([
      {
        ...createAnnotationOfFirstItem("first"),
        cfi: createCfiOfItem(0, { elementIndex: 1 }),
      },
    ])
    await vi.runAllTimersAsync()

    expect(readHighlightedAnnotationIds()).toEqual(["first"])
    expect(readHighlightContainer()).not.toBe(firstHighlightContainer)
  })

  it("reports a tap on a highlight with the latest data of its annotation", async () => {
    const annotations$ = new BehaviorSubject<Annotation[]>([
      createAnnotationOfFirstItem("first"),
    ])
    const reader = await mountAnnotationsReader({ annotations$ })
    const tappedAnnotations: Annotation[] = []
    const highlightTapSubscription = reader.annotations.highlightTap$.subscribe(
      ({ highlight }) => tappedAnnotations.push(highlight),
    )

    annotations$.next([
      { ...createAnnotationOfFirstItem("first"), highlightColor: "blue" },
    ])
    await vi.runAllTimersAsync()

    document
      .querySelector<HTMLElement>(`[data-highlight-container="first"]`)
      ?.click()

    expect(
      tappedAnnotations.map(({ id, highlightColor }) => ({
        id,
        highlightColor,
      })),
    ).toEqual([{ id: "first", highlightColor: "blue" }])

    reader.destroy()

    expect(highlightTapSubscription.closed).toBe(true)
  })

  /**
   * An app can give its annotations through a source that does not replay,
   * once the reader exists. The documents load later, and need that list.
   */
  it("draws the annotations a source without replay gave before the documents loaded", async () => {
    const annotations$ = new Subject<Annotation[]>()
    const mountedReader = mountAnnotationsReader({ annotations$ })

    annotations$.next([createAnnotationOfFirstItem("first")])
    const reader = await mountedReader

    expect(reader.spineItemsManager.get(0)?.value.loadStatus).toBe("loaded")
    expect(readHighlightedAnnotationIds()).toEqual(["first"])
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
