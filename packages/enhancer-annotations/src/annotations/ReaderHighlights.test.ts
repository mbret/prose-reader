// @vitest-environment jsdom
import { BehaviorSubject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createCfiOfItem,
  mountAnnotationsReader,
  readHighlightedAnnotationIds,
} from "../tests/readerHarness.ts"
import { ReaderHighlights } from "./ReaderHighlights.ts"
import type { RuntimeAnnotation } from "./types.ts"

describe("ReaderHighlights", () => {
  /**
   * The enhancer destroys its highlights before the reader releases the
   * documents, so nothing may wait for that release.
   */
  it("holds no highlight, hook or subscription once destroyed", async () => {
    const reader = await mountAnnotationsReader()
    const spineItem = reader.spineItemsManager.get(0)

    if (!spineItem) throw new Error("no first item in the test book")

    const annotations$ = new BehaviorSubject<RuntimeAnnotation[]>([
      { id: "first", cfi: createCfiOfItem(0), itemIndex: 0 },
    ])
    const readerHighlights = new ReaderHighlights(
      reader,
      annotations$,
      new BehaviorSubject<string | undefined>(undefined),
    )
    const reloadDocumentOfItem = async () => {
      spineItem.unload()
      await vi.runAllTimersAsync()
      spineItem.load()
      await vi.runAllTimersAsync()

      expect(spineItem.value.loadStatus).toBe("loaded")
    }

    await reloadDocumentOfItem()

    expect(readHighlightedAnnotationIds()).toEqual(["first"])

    readerHighlights.destroy()

    expect(readHighlightedAnnotationIds()).toEqual([])
    expect(annotations$.observed).toBe(false)

    await reloadDocumentOfItem()

    expect(readHighlightedAnnotationIds()).toEqual([])
    expect(annotations$.observed).toBe(false)
  })
})
