// @vitest-environment jsdom
import { BehaviorSubject, first, map } from "rxjs"
import { describe, expect, it, vi } from "vitest"
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
   * every step. An app that does not handle taps on highlights does not
   * subscribe to `highlightTap$`, and one that does, does: neither changes
   * which highlights exist.
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
        reader.annotations.highlightTap$.subscribe()
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

  it("keeps one highlight per annotation when the list gives its data again", async () => {
    const annotations$ = new BehaviorSubject<Annotation[]>([
      createAnnotationOfFirstItem("first"),
    ])
    await mountAnnotationsReader({ annotations$ })

    annotations$.next([
      { ...createAnnotationOfFirstItem("first"), highlightColor: "blue" },
    ])
    await vi.runAllTimersAsync()

    annotations$.next([
      { ...createAnnotationOfFirstItem("first"), notes: "A note" },
    ])
    await vi.runAllTimersAsync()

    expect(readHighlightedAnnotationIds()).toEqual(["first"])
  })
})
