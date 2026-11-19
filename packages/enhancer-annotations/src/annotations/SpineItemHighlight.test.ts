// @vitest-environment jsdom
import { of } from "rxjs"
import { describe, expect, it, onTestFinished } from "vitest"
import {
  createCfiOfItem,
  mountAnnotationsReader,
} from "../tests/readerHarness.ts"
import { SpineItemHighlight } from "./SpineItemHighlight.ts"
import type { RuntimeAnnotation } from "./types.ts"

describe("SpineItemHighlight", () => {
  /**
   * A highlight resolves its cfi once per load of the document. Given another
   * cfi, it would draw the old place and report the new annotation on a tap.
   */
  it("takes the new data of its annotation, and refuses another id or cfi", async () => {
    const reader = await mountAnnotationsReader()
    const spineItem = reader.spineItemsManager.get(0)

    if (!spineItem) throw new Error("no first item in the test book")

    const annotation: RuntimeAnnotation = {
      id: "first",
      cfi: createCfiOfItem(0),
      itemIndex: 0,
      highlightColor: "red",
    }
    const highlight = new SpineItemHighlight(
      spineItem,
      document.createElement("div"),
      reader,
      annotation,
      of(false),
    )

    onTestFinished(() => highlight.destroy())

    highlight.updateAnnotation({ ...annotation, highlightColor: "blue" })

    expect(highlight.annotation.highlightColor).toBe("blue")
    expect(() =>
      highlight.updateAnnotation({
        ...annotation,
        cfi: createCfiOfItem(0, { elementIndex: 1 }),
      }),
    ).toThrow()
    expect(() =>
      highlight.updateAnnotation({ ...annotation, id: "second" }),
    ).toThrow()
    expect(highlight.annotation).toMatchObject({
      id: "first",
      cfi: createCfiOfItem(0),
      highlightColor: "blue",
    })
  })
})
