// @vitest-environment jsdom
import { BehaviorSubject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createCfiOfItem,
  mountAnnotationsReader,
  readHighlightedAnnotationIds,
} from "../tests/readerHarness.ts"
import { SpineItemHighlights } from "./SpineItemHighlights.ts"
import type { RuntimeAnnotation } from "./types.ts"

describe("SpineItemHighlights", () => {
  /**
   * The highlights of an item live as long as its document is loaded. A
   * document is loaded and released many times in a reading session, so what
   * one of them holds after `destroy()` adds up.
   */
  it("holds no subscription and no element once destroyed", async () => {
    const reader = await mountAnnotationsReader()
    const spineItem = reader.spineItemsManager.get(0)

    if (!spineItem) throw new Error("no first item in the test book")

    const annotationOfItem: RuntimeAnnotation = {
      id: "first",
      cfi: createCfiOfItem(0),
      itemIndex: 0,
    }
    const annotations$ = new BehaviorSubject<RuntimeAnnotation[]>([
      annotationOfItem,
    ])
    const selectedHighlightId$ = new BehaviorSubject<string | undefined>(
      undefined,
    )

    const spineItemHighlights = new SpineItemHighlights(
      annotations$,
      spineItem,
      reader,
      selectedHighlightId$,
    )
    const highlightTapSubscription = spineItemHighlights.tap$.subscribe()
    await vi.runAllTimersAsync()

    expect(readHighlightedAnnotationIds()).toEqual(["first"])

    spineItemHighlights.destroy()

    expect(annotations$.observed).toBe(false)
    expect(selectedHighlightId$.observed).toBe(false)
    expect(highlightTapSubscription.closed).toBe(true)
    expect(readHighlightedAnnotationIds()).toEqual([])
  })
})
