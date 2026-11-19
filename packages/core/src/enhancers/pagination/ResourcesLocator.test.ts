// @vitest-environment jsdom
import { BehaviorSubject, first, map } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createEnhancedTestReader,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  TextDocumentRenderer,
} from "../../tests/readerHarness.ts"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils.ts"

installReaderTestEnvironment()

describe("a resource located on a reader destroyed while it consolidates", () => {
  it("completes without the metadata it was still consolidating", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("the book has no second item")

    const onLocated = vi.fn()
    const onComplete = vi.fn()

    reader
      .locateResource(item)
      .subscribe({ next: onLocated, complete: onComplete })
    // The locator sets up on an idle callback, then consolidates on another.
    await vi.advanceTimersByTimeAsync(1)
    reader.destroy()
    await vi.runAllTimersAsync()

    expect(onLocated).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalled()
  })
})

describe("a resource located on a reader destroyed before the locator sets up", () => {
  it.each([
    ["one resource", false],
    ["a list of resources", true],
  ])("completes as the reader is destroyed, given %s", async (_, asList) => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const item = reader.spineItemsManager.get(1)

    if (!item) throw new Error("the book has no second item")

    const onLocated = vi.fn()
    const onComplete = vi.fn()
    const observer = { next: onLocated, complete: onComplete }

    if (asList) {
      reader.locateResource([item]).subscribe(observer)
    } else {
      reader.locateResource(item).subscribe(observer)
    }

    reader.destroy()

    expect(onComplete).toHaveBeenCalled()

    await vi.runAllTimersAsync()

    expect(onLocated).not.toHaveBeenCalled()
  })
})

describe("a reflowable item located away from the reading position", () => {
  it("stays loaded while it is located, and for a second after", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(3),
      }),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const locatedItem = reader.spineItemsManager.get(2)

    if (!locatedItem) throw new Error("the book has no third item")

    const loadStatusBeforeLocating = locatedItem.value.loadStatus
    const locateResourceSubscription = reader
      .locateResource(locatedItem)
      .subscribe()

    await vi.runAllTimersAsync()
    const loadStatusWhileLocated = locatedItem.value.loadStatus

    locateResourceSubscription.unsubscribe()
    await vi.advanceTimersByTimeAsync(999)
    const loadStatusJustBeforeASecond = locatedItem.value.loadStatus

    await vi.runAllTimersAsync()

    expect({
      loadStatusBeforeLocating,
      loadStatusWhileLocated,
      loadStatusJustBeforeASecond,
      loadStatusAfterASecond: locatedItem.value.loadStatus,
    }).toEqual({
      loadStatusBeforeLocating: "idle",
      loadStatusWhileLocated: "loaded",
      loadStatusJustBeforeASecond: "loaded",
      loadStatusAfterASecond: "idle",
    })
  })
})

describe("a cfi of a reflowable item that is not loaded, located without loading it", () => {
  it("has no page until its item is laid out, then the page of its node until its item unloads", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(3),
      }),
      getRenderer: renderTextDocuments,
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const locatedItem = reader.spineItemsManager.get(2)

    if (!locatedItem) throw new Error("the book has no third item")

    const locatedPages: {
      loadStatus: string
      itemPageIndex: number | undefined
      absolutePageIndex: number | undefined
    }[] = []

    reader
      // The text of the paragraph of the third item.
      .locateResource({ cfi: "epubcfi(/6/6!/4/2/1:3)" }, { mode: "shallow" })
      .subscribe(({ meta: { itemPageIndex, absolutePageIndex } }) => {
        locatedPages.push({
          loadStatus: locatedItem.value.loadStatus,
          itemPageIndex,
          absolutePageIndex,
        })
      })
    await vi.runAllTimersAsync()

    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
    await vi.runAllTimersAsync()
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await vi.runAllTimersAsync()

    // A layout and a change of readiness can each locate it again.
    const locatedStates = locatedPages.filter(
      (located, index) =>
        JSON.stringify(located) !== JSON.stringify(locatedPages[index - 1]),
    )

    expect(locatedStates).toEqual([
      {
        loadStatus: "idle",
        itemPageIndex: undefined,
        absolutePageIndex: undefined,
      },
      { loadStatus: "loaded", itemPageIndex: 0, absolutePageIndex: 2 },
      {
        loadStatus: "idle",
        itemPageIndex: undefined,
        absolutePageIndex: undefined,
      },
    ])
  })
})

describe("a cfi located in a reflowable item that unloads while no layout can complete", () => {
  it("loses its page as its item unloads, without waiting for the layout", async () => {
    vi.useFakeTimers()

    const isLayoutHeld = new BehaviorSubject(false)

    // A text document whose layouts complete only while they are not held.
    class HeldLayoutTextRenderer extends TextDocumentRenderer {
      onLayout() {
        return isLayoutHeld.pipe(
          first((isHeld) => !isHeld),
          map(() => undefined),
        )
      }
    }

    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(3),
      }),
      getRenderer: () => (props) => new HeldLayoutTextRenderer(props),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const locatedItem = reader.spineItemsManager.get(2)

    if (!locatedItem) throw new Error("the book has no third item")

    const onLocated = vi.fn()

    reader
      // The text of the paragraph of the third item.
      .locateResource({ cfi: "epubcfi(/6/6!/4/2/1:3)" }, { mode: "shallow" })
      .subscribe(onLocated)
    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
    await vi.runAllTimersAsync()

    const pageWhileLoaded = onLocated.mock.lastCall?.[0].meta.itemPageIndex

    isLayoutHeld.next(true)
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await vi.runAllTimersAsync()

    expect({
      pageWhileLoaded,
      loadStatus: locatedItem.value.loadStatus,
      isLayoutCurrent: reader.spine.isLayoutCurrent(),
      pageOnceUnloaded: onLocated.mock.lastCall?.[0].meta.itemPageIndex,
      nodeOnceUnloaded: onLocated.mock.lastCall?.[0].meta.node,
    }).toEqual({
      pageWhileLoaded: 0,
      loadStatus: "idle",
      isLayoutCurrent: false,
      pageOnceUnloaded: undefined,
      nodeOnceUnloaded: null,
    })
  })
})

describe("a cfi located while its reflowable item is being laid out", () => {
  it("has no page until that layout completes", async () => {
    vi.useFakeTimers()

    const isLayoutHeld = new BehaviorSubject(false)

    // A text document whose layouts complete only while they are not held.
    class HeldLayoutTextRenderer extends TextDocumentRenderer {
      onLayout() {
        return isLayoutHeld.pipe(
          first((isHeld) => !isHeld),
          map(() => undefined),
        )
      }
    }

    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(2),
      }),
      getRenderer: () => (props) => new HeldLayoutTextRenderer(props),
      numberOfAdjacentSpineItemToPreLoad: 0,
    })

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const locatedItem = reader.spineItemsManager.get(0)

    if (!locatedItem) throw new Error("the book has no first item")

    isLayoutHeld.next(true)
    reader.layout()
    await vi.runAllTimersAsync()

    const onLocated = vi.fn()

    reader
      // The text of the paragraph of the first item.
      .locateResource({ cfi: "epubcfi(/6/2!/4/2/1:3)" }, { mode: "shallow" })
      .subscribe(onLocated)
    await vi.runAllTimersAsync()

    const itemWhileLaidOut = {
      isReady: locatedItem.value.isReady,
      isDirty: locatedItem.value.isDirty,
    }
    const pageWhileLaidOut = onLocated.mock.lastCall?.[0].meta.itemPageIndex

    isLayoutHeld.next(false)
    await vi.runAllTimersAsync()

    expect({
      itemWhileLaidOut,
      pageWhileLaidOut,
      pageOnceLaidOut: onLocated.mock.lastCall?.[0].meta.itemPageIndex,
    }).toEqual({
      itemWhileLaidOut: { isReady: true, isDirty: true },
      pageWhileLaidOut: undefined,
      pageOnceLaidOut: 0,
    })
  })
})

describe("a resource located without loading its item", () => {
  it.each([
    [
      "a reflowable spine item",
      (reader: ReturnType<typeof createEnhancedTestReader>) =>
        reader.spineItemsManager.get(2),
      "reflowable",
    ],
    [
      "a cfi of a pre-paginated item",
      () => ({ cfi: "epubcfi(/6/6!/4/2/1:3)" }),
      "pre-paginated",
    ],
  ] as const)(
    "is on the first page of its item, given %s",
    async (_, getResource, renditionLayout) => {
      vi.useFakeTimers()

      const reader = createEnhancedTestReader({
        manifest: createTestManifest({
          renditionLayout,
          spineItems: createTestManifestSpineItems(3),
        }),
        numberOfAdjacentSpineItemToPreLoad: 0,
      })

      mountTestReader(reader)
      await vi.runAllTimersAsync()

      const resource = getResource(reader)

      if (!resource) throw new Error("the book has no third item")

      const onLocated = vi.fn()

      reader.locateResource(resource, { mode: "shallow" }).subscribe(onLocated)
      await vi.runAllTimersAsync()

      expect({
        loadStatus: reader.spineItemsManager.get(2)?.value.loadStatus,
        itemPageIndex: onLocated.mock.lastCall?.[0].meta.itemPageIndex,
        absolutePageIndex: onLocated.mock.lastCall?.[0].meta.absolutePageIndex,
      }).toEqual({ loadStatus: "idle", itemPageIndex: 0, absolutePageIndex: 2 })
    },
  )
})

describe("resources located at the same cfi", () => {
  it("share one consolidation, and each come back with their own result", async () => {
    vi.useFakeTimers()

    const reader = createEnhancedTestReader()

    mountTestReader(reader)
    await vi.runAllTimersAsync()

    const cfi = "epubcfi(/6/4!)"
    const firstResource = { cfi, id: "first" }
    const secondResource = { cfi, id: "second" }
    const onLocated = vi.fn()

    reader.locateResource([firstResource, secondResource]).subscribe(onLocated)
    await vi.runAllTimersAsync()

    const [firstLocated, secondLocated] = onLocated.mock.lastCall?.[0] ?? []

    expect({
      isMetaShared: firstLocated?.meta === secondLocated?.meta,
      resourceIds: [firstLocated?.resource.id, secondLocated?.resource.id],
    }).toEqual({
      isMetaShared: true,
      resourceIds: ["first", "second"],
    })
  })
})
