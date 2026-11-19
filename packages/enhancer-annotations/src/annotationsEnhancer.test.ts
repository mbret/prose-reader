// @vitest-environment jsdom
import { BehaviorSubject, first, map, Subject } from "rxjs"
import { describe, expect, it, onTestFinished, vi } from "vitest"
import {
  createCfiOfItem,
  EmptyRenderer,
  mountAnnotationsReader,
  readHighlightedAnnotationIds,
} from "./tests/readerHarness.ts"
import type { Annotation } from "./types.ts"

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
