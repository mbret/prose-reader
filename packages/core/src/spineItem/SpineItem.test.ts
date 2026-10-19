// @vitest-environment jsdom
import { filter, firstValueFrom, timeout } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createTestReader,
  holdItemDocumentLoadHooks,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  settledOn,
} from "../tests/readerHarness"
import type { DocumentLoadStatus } from "./renderer/DocumentRenderer"
import type { SpineItemState } from "./SpineItem"

installReaderTestEnvironment()

describe("SpineItem readiness", () => {
  it("never reports readiness without a loaded document", async () => {
    const reader = createTestReader()

    const item = reader.spineItemsManager.items[0]
    if (!item) throw new Error("expected a spine item")

    const samples: Pick<SpineItemState, "loadStatus" | "isReady">[] = []
    item.subscribe(({ loadStatus, isReady }) =>
      samples.push({ loadStatus, isReady }),
    )

    mountTestReader(reader)

    await firstValueFrom(item.isReady$.pipe(filter(Boolean), timeout(2000)))

    const violations = () =>
      samples.filter(
        ({ loadStatus, isReady }) => isReady && loadStatus !== "loaded",
      )

    expect(violations()).toEqual([])
    expect(item.value.isReady).toBe(true)
    expect(item.value.loadStatus).toBe("loaded")

    // Losing the document ends readiness at once, rather than leaving it
    // standing until some later layout happens to recompute it.
    item.unload()
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(item.value.loadStatus).toBe("idle")
    expect(item.value.isReady).toBe(false)

    // The invariant itself, across every state the item went through.
    expect(violations()).toEqual([])
  })
})

describe("SpineItem loaded document", () => {
  it("is the document its frame holds only while the item is loaded: not while hooks set it up, nor from the moment it starts leaving", async () => {
    // Item 1 loads only once the reader goes there, and leaves once it goes
    // back.
    const reader = createTestReader({
      getRenderer: renderTextDocuments,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })
    const documentLoadHooks = holdItemDocumentLoadHooks(reader, "1")

    mountTestReader(reader)
    await settledOn(reader, 0)

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("item 1 is missing")

    const getFrameDocument = () =>
      item.renderer.getDocumentFrame()?.contentDocument ?? undefined
    const nameDocument = (document: Document | undefined) =>
      document &&
      (document === getFrameDocument()
        ? "the frame's document"
        : "another document")
    const describeItem = () => ({
      loadStatus: item.value.loadStatus,
      frameHoldsDocument: getFrameDocument() !== undefined,
      loadedDocument: nameDocument(item.value.loadedDocument),
    })

    // Every state the item goes through, and each loaded document watched.
    const states: {
      loadStatus: DocumentLoadStatus
      loadedDocument: string | undefined
    }[] = []
    const watched: (string | undefined)[] = []

    item.subscribe(({ loadStatus, loadedDocument }) => {
      states.push({ loadStatus, loadedDocument: nameDocument(loadedDocument) })
    })
    item.watch("loadedDocument").subscribe((loadedDocument) => {
      watched.push(nameDocument(loadedDocument))
    })

    reader.navigation.goToSpineItem({ indexOrId: 1, animation: false })
    await vi.waitFor(() =>
      expect(getFrameDocument()?.body.textContent).toBe("A paragraph of text."),
    )

    // Its frame holds the document, which the hooks are still setting up.
    expect(describeItem()).toEqual({
      loadStatus: "loading",
      frameHoldsDocument: true,
      loadedDocument: undefined,
    })

    documentLoadHooks.release()
    await settledOn(reader, 1)

    expect(describeItem()).toEqual({
      loadStatus: "loaded",
      frameHoldsDocument: true,
      loadedDocument: "the frame's document",
    })

    // Its frame holds the document until it is released, once leaving.
    const describedWhileReleased: ReturnType<typeof describeItem>[] = []

    reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
      if (itemId === "1") describedWhileReleased.push(describeItem())
    })

    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await vi.waitFor(() => expect(item.value.loadStatus).toBe("idle"))

    expect(describedWhileReleased).toEqual([
      {
        loadStatus: "unloading",
        frameHoldsDocument: true,
        loadedDocument: undefined,
      },
    ])
    // The invariant, across every state the item went through.
    expect(
      states.filter(
        ({ loadStatus, loadedDocument }) =>
          (loadStatus === "loaded") !==
          (loadedDocument === "the frame's document"),
      ),
    ).toEqual([])
    expect(watched).toEqual([undefined, "the frame's document", undefined])
  })

  it("holds none once the item is destroyed, its document released before its state completes", async () => {
    const reader = createTestReader({ getRenderer: renderTextDocuments })

    mountTestReader(reader)
    await settledOn(reader, 0)

    const item = reader.spineItemsManager.get(0)

    if (!item) throw new Error("item 0 is missing")

    const events: string[] = []

    item.watch("loadedDocument").subscribe({
      next: (loadedDocument) =>
        events.push(loadedDocument ? "loaded document" : "no loaded document"),
      complete: () => events.push("complete"),
    })
    reader.hookManager.register("item.onDocumentUnload", ({ itemId }) => {
      if (itemId === "0") events.push("released")
    })

    /**
     * A destroy releases the document at once, without an unload: the item
     * stays `loaded`, and its document goes once released, before the state
     * completes. What watches it lets go of it, and nothing holds it after.
     */
    reader.destroy()

    expect(events).toEqual([
      "loaded document",
      "released",
      "no loaded document",
      "complete",
    ])
    expect(item.value).toMatchObject({
      loadStatus: "loaded",
      loadedDocument: undefined,
    })
  })

  it("is none for a loaded item rendered without a document frame", async () => {
    // The default renderer has no document, as an audio item has none.
    const reader = createTestReader()

    mountTestReader(reader)
    await settledOn(reader, 0)

    expect(reader.spineItemsManager.get(0)?.value).toMatchObject({
      loadStatus: "loaded",
      loadedDocument: undefined,
    })
  })
})

describe("SpineItemState", () => {
  it("holds a load error only with the error status", () => {
    const failed: SpineItemState = {
      loadStatus: "error",
      loadError: new Error("resource failed"),
      loadedDocument: undefined,
      isReady: false,
      isDirty: false,
    }
    // @ts-expect-error a load error goes only with the `error` status
    const loadedWithAnError: SpineItemState = {
      loadStatus: "loaded",
      loadError: new Error("resource failed"),
      loadedDocument: undefined,
      isReady: false,
      isDirty: false,
    }

    // The type check is the test: both values only exist to be checked.
    expect([failed, loadedWithAnError]).toHaveLength(2)
  })
})
