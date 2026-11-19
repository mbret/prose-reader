// @vitest-environment jsdom
import { asapScheduler, BehaviorSubject, first, switchMap } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import {
  createEnhancedTestReader,
  holdItemLayout,
  installReaderTestEnvironment,
  mountTestReader,
  renderTextDocuments,
  renderTextDocumentsWithParagraphOnSetPage,
  TextDocumentRenderer,
} from "../../tests/readerHarness.ts"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils.ts"

installReaderTestEnvironment()

describe("a resource located on a reader destroyed before it is consolidated", () => {
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
      isItemReady: boolean
      itemPageIndex: number | undefined
      absolutePageIndex: number | undefined
    }[] = []

    reader
      // The text of the paragraph of the third item.
      .locateResource({ cfi: "epubcfi(/6/6!/4/2/1:3)" }, { mode: "shallow" })
      .subscribe(({ meta: { itemPageIndex, absolutePageIndex } }) => {
        locatedPages.push({
          isItemReady: locatedItem.value.isReady,
          itemPageIndex,
          absolutePageIndex,
        })
      })
    await vi.runAllTimersAsync()

    reader.navigation.goToSpineItem({ indexOrId: 2, animation: false })
    await vi.runAllTimersAsync()
    reader.navigation.goToSpineItem({ indexOrId: 0, animation: false })
    await vi.runAllTimersAsync()

    // A layout and a change of readiness of any item can locate it again.
    const pages = locatedPages.map(({ itemPageIndex, absolutePageIndex }) => ({
      itemPageIndex,
      absolutePageIndex,
    }))
    const pagesAsTheyChanged = pages.filter(
      (page, index) =>
        JSON.stringify(page) !== JSON.stringify(pages[index - 1]),
    )

    expect({
      pagesAsTheyChanged,
      hasHadAPageWhileItsItemWasNotReady: locatedPages.some(
        ({ isItemReady, itemPageIndex }) =>
          !isItemReady && itemPageIndex !== undefined,
      ),
    }).toEqual({
      pagesAsTheyChanged: [
        { itemPageIndex: undefined, absolutePageIndex: undefined },
        { itemPageIndex: 0, absolutePageIndex: 2 },
        { itemPageIndex: undefined, absolutePageIndex: undefined },
      ],
      hasHadAPageWhileItsItemWasNotReady: false,
    })
  })
})

describe("a cfi located in a reflowable item that unloads while no layout can complete", () => {
  it("loses its page as its item unloads, without waiting for the layout", async () => {
    vi.useFakeTimers()

    // The first item loads as the reader goes back to it.
    const firstItem = holdItemLayout("item-0.xhtml", TextDocumentRenderer)
    const reader = createEnhancedTestReader({
      manifest: createTestManifest({
        renditionLayout: "reflowable",
        spineItems: createTestManifestSpineItems(3),
      }),
      getRenderer: firstItem.getRenderer,
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

    firstItem.hold()
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

/**
 * Two reflowable items, each three pages wide with its paragraph on the page
 * the test sets, the first one's layouts held while the test holds them.
 */
const mountReaderWithParagraphOnSetPage = async () => {
  const paragraph = renderTextDocumentsWithParagraphOnSetPage()
  const firstItemLayout = holdItemLayout("item-0.xhtml", paragraph.Renderer)
  const reader = createEnhancedTestReader({
    manifest: createTestManifest({
      renditionLayout: "reflowable",
      spineItems: createTestManifestSpineItems(2),
    }),
    getRenderer: firstItemLayout.getRenderer,
    numberOfAdjacentSpineItemToPreLoad: 1,
  })

  paragraph.setPageIndexOfParagraph(1)
  mountTestReader(reader)
  await vi.runAllTimersAsync()

  const firstItem = reader.spineItemsManager.get(0)
  const secondItem = reader.spineItemsManager.get(1)

  if (!firstItem || !secondItem) throw new Error("the book has no two items")

  return { reader, paragraph, firstItemLayout, firstItem, secondItem }
}

/** Text of the paragraph of the first item. */
const cfiInFirstItem = "epubcfi(/6/2!/4/2/1:3)"
const otherCfiInFirstItem = "epubcfi(/6/2!/4/2/1:5)"
const thirdCfiInFirstItem = "epubcfi(/6/2!/4/2/1:7)"

describe("a cfi located on its item's last layout, while the item awaits a new one", () => {
  it("keeps the page that layout gave it, while a cfi located meanwhile has none, until the new layout completes", async () => {
    vi.useFakeTimers()

    const { reader, paragraph, firstItemLayout, firstItem, secondItem } =
      await mountReaderWithParagraphOnSetPage()
    const onLocatedBefore = vi.fn()

    reader
      .locateResource({ cfi: cfiInFirstItem }, { mode: "shallow" })
      .subscribe(onLocatedBefore)
    await vi.runAllTimersAsync()

    const pageOnLastLayout =
      onLocatedBefore.mock.lastCall?.[0].meta.itemPageIndex

    // The next layout of the first item puts its paragraph on its third page.
    paragraph.setPageIndexOfParagraph(2)
    firstItemLayout.hold()
    reader.layout()
    await vi.runAllTimersAsync()

    const onLocatedMeanwhile = vi.fn()

    reader
      .locateResource({ cfi: otherCfiInFirstItem }, { mode: "shallow" })
      .subscribe(onLocatedMeanwhile)
    // An item that unloads locates every resource again.
    secondItem.unload()
    await vi.runAllTimersAsync()

    const whileAwaitingLayout = {
      isFirstItemReady: firstItem.value.isReady,
      isFirstItemDirty: firstItem.value.isDirty,
      isSecondItemReady: secondItem.value.isReady,
      pageOfCfiLocatedBefore:
        onLocatedBefore.mock.lastCall?.[0].meta.itemPageIndex,
      pageOfCfiLocatedMeanwhile:
        onLocatedMeanwhile.mock.lastCall?.[0].meta.itemPageIndex,
    }

    firstItemLayout.release()
    await vi.runAllTimersAsync()

    expect({
      pageOnLastLayout,
      whileAwaitingLayout,
      onceLaidOut: {
        pageOfCfiLocatedBefore:
          onLocatedBefore.mock.lastCall?.[0].meta.itemPageIndex,
        pageOfCfiLocatedMeanwhile:
          onLocatedMeanwhile.mock.lastCall?.[0].meta.itemPageIndex,
      },
    }).toEqual({
      pageOnLastLayout: 1,
      whileAwaitingLayout: {
        isFirstItemReady: true,
        isFirstItemDirty: true,
        isSecondItemReady: false,
        pageOfCfiLocatedBefore: 1,
        pageOfCfiLocatedMeanwhile: undefined,
      },
      onceLaidOut: {
        pageOfCfiLocatedBefore: 2,
        pageOfCfiLocatedMeanwhile: 2,
      },
    })
  })
})

describe("a cfi whose item completed a layout since it was located, while the item awaits another one", () => {
  it("has no page until that layout completes", async () => {
    vi.useFakeTimers()

    const { reader, paragraph, firstItemLayout, firstItem } =
      await mountReaderWithParagraphOnSetPage()
    const onLocated = vi.fn()

    reader
      .locateResource({ cfi: cfiInFirstItem }, { mode: "shallow" })
      .subscribe(onLocated)
    await vi.runAllTimersAsync()

    const pageOnFirstLayout = onLocated.mock.lastCall?.[0].meta.itemPageIndex

    // The next layout puts the paragraph on the third page. Another layout is
    // requested as soon as it completes, before the cfi is located again.
    paragraph.setPageIndexOfParagraph(2)
    reader.spine.layout$.pipe(first()).subscribe(() => {
      asapScheduler.schedule(() => {
        firstItemLayout.hold()
        reader.layout()
      })
    })
    reader.layout()
    await vi.runAllTimersAsync()

    const whileAwaitingLayout = {
      isFirstItemDirty: firstItem.value.isDirty,
      page: onLocated.mock.lastCall?.[0].meta.itemPageIndex,
    }

    firstItemLayout.release()
    await vi.runAllTimersAsync()

    expect({
      pageOnFirstLayout,
      whileAwaitingLayout,
      pageOnceLaidOut: onLocated.mock.lastCall?.[0].meta.itemPageIndex,
    }).toEqual({
      pageOnFirstLayout: 1,
      whileAwaitingLayout: { isFirstItemDirty: true, page: undefined },
      pageOnceLaidOut: 2,
    })
  })
})

describe("a list of resources", () => {
  it("emits each time with every resource located again, or none of them", async () => {
    vi.useFakeTimers()

    const { reader } = await mountReaderWithParagraphOnSetPage()
    const emissions: { meta: object }[][] = []

    reader
      .locateResource(
        [
          { cfi: cfiInFirstItem },
          { cfi: otherCfiInFirstItem },
          { cfi: thirdCfiInFirstItem },
        ],
        { mode: "shallow" },
      )
      .subscribe((located) => emissions.push(located))
    await vi.runAllTimersAsync()
    reader.layout()
    await vi.runAllTimersAsync()

    const numberOfResourcesLocatedAgainByEmission = emissions
      .slice(1)
      .map(
        (located, emissionIndex) =>
          located.filter(
            ({ meta }, index) =>
              meta !== emissions[emissionIndex]?.[index]?.meta,
          ).length,
      )

    expect({
      hasEmittedSinceTheLayout: emissions.length > 1,
      numberOfResourcesLocatedAgainByEmission: [
        ...new Set(numberOfResourcesLocatedAgainByEmission),
      ],
    }).toEqual({
      hasEmittedSinceTheLayout: true,
      numberOfResourcesLocatedAgainByEmission: [3],
    })
  })

  it("located again at once, as a switchMap does when the list changes, keeps the location of each cfi it still holds", async () => {
    vi.useFakeTimers()

    const { reader } = await mountReaderWithParagraphOnSetPage()
    const list$ = new BehaviorSubject([
      { cfi: cfiInFirstItem },
      { cfi: otherCfiInFirstItem },
    ])
    const emissions: { resource: { cfi: string }; meta: object }[][] = []

    list$
      .pipe(
        switchMap((list) => reader.locateResource(list, { mode: "shallow" })),
      )
      .subscribe((located) => emissions.push(located))
    await vi.runAllTimersAsync()

    const locationOnFirstList = emissions.at(-1)?.[0]?.meta

    list$.next([{ cfi: cfiInFirstItem }, { cfi: thirdCfiInFirstItem }])
    await vi.runAllTimersAsync()

    expect({
      cfis: emissions.at(-1)?.map(({ resource }) => resource.cfi),
      isLocationKept: emissions.at(-1)?.[0]?.meta === locationOnFirstList,
    }).toEqual({
      cfis: [cfiInFirstItem, thirdCfiInFirstItem],
      isLocationKept: true,
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
