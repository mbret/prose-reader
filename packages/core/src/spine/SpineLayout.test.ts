import type { Manifest } from "@prose-reader/shared"
import { EMPTY, firstValueFrom, of, Subject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { SpineItem } from "../spineItem/SpineItem"
import {
  createTestManifest,
  createTestManifestSpineItems,
  recordUnhandledErrors,
  waitFor,
} from "../tests/utils"
import { Viewport } from "../viewport/Viewport"
import { SpineItemsManager } from "./SpineItemsManager"
import { SpineItemsObserver } from "./SpineItemsObserver"
import { SpineLayout } from "./SpineLayout"

/**
 * A spine layout of `items`, and what it is built on, in a viewport of
 * `viewportSize`.
 */
const createTestSpineLayout = ({
  items = 1,
  manifest,
  initialSettings = {},
  viewportSize = { height: 100, width: 100 },
}: {
  items?: Parameters<typeof createTestManifestSpineItems>[0]
  manifest?: Partial<Manifest>
  initialSettings?: ConstructorParameters<typeof ReaderSettingsManager>[0]
  viewportSize?: { height: number; width: number }
} = {}) => {
  const context = new Context(
    createTestManifest({
      ...manifest,
      spineItems: createTestManifestSpineItems(items),
    }),
  )
  const settings = new ReaderSettingsManager(initialSettings, context)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(
    context,
    settings,
    hookManager,
    viewport,
  )
  const spineItemsObserver = new SpineItemsObserver(spineItemsManager)
  const spineLayout = new SpineLayout(
    spineItemsManager,
    spineItemsObserver,
    context,
    settings,
    viewport,
  )

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
    viewportSize.width,
  )
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(
    viewportSize.height,
  )
  viewport.layout()

  const destroy = () => {
    spineLayout.destroy()
    spineItemsManager.destroy()
    viewport.destroy()
    settings.destroy()
    context.destroy()
  }

  return {
    destroy,
    hookManager,
    spineItemsManager,
    spineLayout,
    viewport,
  }
}

const createSpreadModeTestEnvironment = ({
  pageHeight,
  pageWidth,
  readingDirection,
  items,
}: {
  pageHeight: number
  pageWidth: number
  readingDirection: Manifest["readingDirection"]
  items: Array<Partial<Manifest["spineItems"][number]> | undefined>
}) => {
  const { destroy, hookManager, spineLayout } = createTestSpineLayout({
    items,
    manifest: {
      filename: "",
      title: "",
      readingDirection,
      renditionLayout: "pre-paginated",
      renditionSpread: "auto",
    },
    initialSettings: { spreadMode: "always" },
    viewportSize: { height: pageHeight, width: pageWidth * 2 },
  })
  const layoutRequests: Array<{
    blankPagePosition: "before" | "after" | "none"
    id: string
    minimumWidth: number
  }> = []

  hookManager.register(
    "item.onBeforeLayout",
    ({ blankPagePosition, item, minimumWidth }) => {
      layoutRequests.push({
        blankPagePosition,
        id: item.id,
        minimumWidth,
      })
    },
  )

  return {
    destroy,
    layoutRequests,
    spineLayout,
  }
}

type ItemSize = { height: number; width: number }

/**
 * Every item's renderer layout stays pending until the test completes it, so a
 * pass can be superseded while only part of the spine has been laid out. The
 * rest of the item's layout runs: it sizes the item's container, rounding up
 * to whole pages of 100 by 100, and updates the item's state.
 */
const createDeferredSpineLayout = (numberOfItems: number) => {
  const { destroy, hookManager, spineItemsManager, spineLayout, viewport } =
    createTestSpineLayout({
      items: numberOfItems,
    })

  // An item asked to lay out again drops the layout it had pending, so only
  // the newest one per item can complete.
  const pendingLayouts: (Subject<ItemSize> | undefined)[] =
    spineItemsManager.items.map(() => undefined)
  const layoutsStarted = spineItemsManager.items.map(() => 0)

  spineItemsManager.items.forEach((item, itemIndex) => {
    vi.spyOn(item.renderer, "onLayout").mockImplementation(() => {
      const result = new Subject<ItemSize>()

      pendingLayouts[itemIndex] = result
      layoutsStarted[itemIndex] = (layoutsStarted[itemIndex] ?? 0) + 1

      return result
    })
  })

  const takePendingLayout = (itemIndex: number) => {
    const result = pendingLayouts[itemIndex]

    if (!result) throw new Error(`No pending layout for item ${itemIndex}`)

    pendingLayouts[itemIndex] = undefined

    return result
  }

  const completeItemLayout = (itemIndex: number, size: ItemSize) => {
    const result = takePendingLayout(itemIndex)

    result.next(size)
    result.complete()
  }

  const failItemLayout = (itemIndex: number, error: Error) => {
    takePendingLayout(itemIndex).error(error)
  }

  const widths = () =>
    spineItemsManager.items.map(
      (_, itemIndex) =>
        spineLayout.getSpineItemSpineLayoutInfo(itemIndex).width,
    )

  const lefts = () =>
    spineItemsManager.items.map(
      (_, itemIndex) => spineLayout.getSpineItemSpineLayoutInfo(itemIndex).left,
    )

  /** How many times each item has been asked to lay out. */
  const itemLayoutsStarted = () => [...layoutsStarted]

  const dirtyFlags = () =>
    spineItemsManager.items.map((item) => item.value.isDirty)

  /** Lays every item out at the same size, in one completed pass. */
  const layOutSpine = async (size: ItemSize) => {
    const passDone = firstValueFrom(spineLayout.layout$)

    spineLayout.layout({ immediate: true })
    spineItemsManager.items.forEach((_, itemIndex) => {
      completeItemLayout(itemIndex, size)
    })

    await passDone
  }

  return {
    completeItemLayout,
    destroy,
    dirtyFlags,
    failItemLayout,
    hookManager,
    itemLayoutsStarted,
    items: spineItemsManager.items,
    layOutSpine,
    lefts,
    spineLayout,
    viewport,
    widths,
  }
}

/** Requests a layout of the spine, and waits for its pass to complete. */
const layOutAndWait = async (spineLayout: SpineLayout) => {
  const passDone = firstValueFrom(spineLayout.layout$)

  spineLayout.layout({ immediate: true })

  await passDone
}

/** Each stage the layout goes through, and `error` if its state errors. */
const recordLayoutStages = (spineLayout: SpineLayout) => {
  const stages: string[] = []

  spineLayout.lifecycle$.subscribe({
    next: ({ stage }) => {
      stages.push(stage)
    },
    error: () => {
      stages.push("error")
    },
  })

  return stages
}

/** The number of frames on the call stack where it is called. */
const getCallStackDepth = () => {
  const { stackTraceLimit } = Error

  Error.stackTraceLimit = Number.POSITIVE_INFINITY

  const depth = new Error().stack?.split("\n").length ?? 0

  Error.stackTraceLimit = stackTraceLimit

  return depth
}

describe("SpineLayout", () => {
  it("debounces regular external layout requests", async () => {
    vi.useFakeTimers()
    const { destroy, spineLayout } = createTestSpineLayout()

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout()

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(0)

      await vi.advanceTimersByTimeAsync(49)

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(0)

      await vi.advanceTimersByTimeAsync(1)
      await layoutDone

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(100)
    } finally {
      destroy()
      vi.useRealTimers()
    }
  })

  it("runs immediate external layout requests without the debounce delay", async () => {
    const { destroy, spineLayout } = createTestSpineLayout()

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(spineLayout.getSpineItemSpineLayoutInfo(0).width).toBe(100)
    } finally {
      destroy()
    }
  })

  it("announces that a pass starts once the wait of its request is over, before it asks an item to lay out", async () => {
    vi.useFakeTimers()
    const { completeItemLayout, destroy, itemLayoutsStarted, spineLayout } =
      createDeferredSpineLayout(2)

    try {
      const stages: { stage: string; itemLayoutsStarted: number[] }[] = []

      spineLayout.lifecycle$.subscribe(({ stage }) => {
        stages.push({ stage, itemLayoutsStarted: itemLayoutsStarted() })
      })

      spineLayout.layout()

      expect(stages).toEqual([
        { stage: "requested", itemLayoutsStarted: [0, 0] },
      ])

      await vi.advanceTimersByTimeAsync(50)

      // The first item is asked to lay out right after the announcement.
      expect(stages).toEqual([
        { stage: "requested", itemLayoutsStarted: [0, 0] },
        { stage: "layingOut", itemLayoutsStarted: [0, 0] },
      ])
      expect(itemLayoutsStarted()).toEqual([1, 0])

      completeItemLayout(0, { height: 100, width: 100 })
      completeItemLayout(1, { height: 100, width: 100 })

      expect(stages.map(({ stage }) => stage)).toEqual([
        "requested",
        "layingOut",
        "laidOut",
      ])
    } finally {
      destroy()
      vi.useRealTimers()
    }
  })

  it("does not publish item layouts until the whole pass completes", async () => {
    const { completeItemLayout, destroy, spineLayout, widths } =
      createDeferredSpineLayout(3)

    try {
      spineLayout.layout({ immediate: true })

      completeItemLayout(0, { height: 100, width: 100 })
      completeItemLayout(1, { height: 100, width: 100 })

      // Two of three items are laid out. Nothing is published yet, so readers
      // still see the previous layout rather than a half updated one.
      expect(widths()).toEqual([0, 0, 0])

      const layoutDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(2, { height: 100, width: 100 })
      await layoutDone

      expect(widths()).toEqual([100, 100, 100])
    } finally {
      destroy()
    }
  })

  it("keeps the last completed layout readable while a new pass is in flight", async () => {
    const { completeItemLayout, destroy, layOutSpine, spineLayout, widths } =
      createDeferredSpineLayout(3)

    try {
      await layOutSpine({ height: 100, width: 100 })

      expect(widths()).toEqual([100, 100, 100])

      // A new pass lays out part of the spine. Until it completes, readers keep
      // seeing the previous layout instead of a mix of the two.
      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 200 })
      completeItemLayout(1, { height: 100, width: 200 })

      expect(widths()).toEqual([100, 100, 100])

      // That pass is superseded before completing, so its item layouts are
      // discarded rather than published alongside the next pass's.
      const lastPassDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 300 })
      completeItemLayout(1, { height: 100, width: 300 })
      completeItemLayout(2, { height: 100, width: 300 })
      await lastPassDone

      expect(widths()).toEqual([300, 300, 300])
    } finally {
      destroy()
    }
  })

  it("lays out an item whose load ended and the items after it, and keeps the layouts of the items before it", async () => {
    const {
      completeItemLayout,
      destroy,
      dirtyFlags,
      itemLayoutsStarted,
      items,
      layOutSpine,
      lefts,
      spineLayout,
      widths,
    } = createDeferredSpineLayout(3)

    try {
      await layOutSpine({ height: 100, width: 100 })

      items[1]?.load()
      await vi.waitFor(() => expect(itemLayoutsStarted()).toEqual([1, 2, 1]))

      // The first item is kept, so nothing in this pass would clear its dirty
      // flag.
      expect(dirtyFlags()).toEqual([false, true, true])

      const passDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(1, { height: 100, width: 200 })
      completeItemLayout(2, { height: 100, width: 100 })
      await passDone

      // An item's place depends on the items before it only, so the first item
      // is not laid out again, and the next ones start where it ends.
      expect(itemLayoutsStarted()).toEqual([1, 2, 2])
      expect(widths()).toEqual([100, 200, 100])
      expect(lefts()).toEqual([0, 100, 300])
      expect(dirtyFlags()).toEqual([false, false, false])
    } finally {
      destroy()
    }
  })

  it("lays out from the first item of a request whose pass was cancelled", async () => {
    const {
      completeItemLayout,
      destroy,
      itemLayoutsStarted,
      items,
      layOutSpine,
      lefts,
      spineLayout,
      widths,
    } = createDeferredSpineLayout(3)

    try {
      await layOutSpine({ height: 100, width: 100 })

      // A pass for the second item's load lays it out, then waits on the third.
      items[1]?.load()
      await vi.waitFor(() => expect(itemLayoutsStarted()).toEqual([1, 2, 1]))
      completeItemLayout(1, { height: 100, width: 200 })

      /**
       * The third item's load cancels that pass, whose layout of the second
       * item was never published. The next pass lays out from the second item
       * again, not from the third, which would start where the second item
       * ended before it changed.
       */
      items[2]?.load()
      await vi.waitFor(() => expect(itemLayoutsStarted()).toEqual([1, 3, 2]))

      const passDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(1, { height: 100, width: 200 })
      completeItemLayout(2, { height: 100, width: 100 })
      await passDone

      expect(itemLayoutsStarted()).toEqual([1, 3, 3])
      expect(widths()).toEqual([100, 200, 100])
      expect(lefts()).toEqual([0, 100, 300])
    } finally {
      destroy()
    }
  })

  it("lays out every item when an item's load cancels the pass of a reader layout", async () => {
    const {
      completeItemLayout,
      destroy,
      itemLayoutsStarted,
      items,
      layOutSpine,
      lefts,
      spineLayout,
      widths,
    } = createDeferredSpineLayout(3)

    try {
      await layOutSpine({ height: 100, width: 100 })

      spineLayout.layout({ immediate: true })
      completeItemLayout(0, { height: 100, width: 200 })

      items[2]?.load()
      await vi.waitFor(() => expect(itemLayoutsStarted()).toEqual([3, 2, 1]))

      const passDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(0, { height: 100, width: 200 })
      completeItemLayout(1, { height: 100, width: 100 })
      completeItemLayout(2, { height: 100, width: 100 })
      await passDone

      expect(widths()).toEqual([200, 100, 100])
      expect(lefts()).toEqual([0, 200, 300])
    } finally {
      destroy()
    }
  })

  it("lays out every item for an item's load before any pass completed", async () => {
    const {
      completeItemLayout,
      destroy,
      itemLayoutsStarted,
      items,
      spineLayout,
      widths,
    } = createDeferredSpineLayout(3)

    try {
      // No pass has laid out the first item, so there is no layout to keep.
      items[1]?.load()
      await vi.waitFor(() => expect(itemLayoutsStarted()).toEqual([1, 0, 0]))

      const passDone = firstValueFrom(spineLayout.layout$)

      completeItemLayout(0, { height: 100, width: 100 })
      completeItemLayout(1, { height: 100, width: 100 })
      completeItemLayout(2, { height: 100, width: 100 })
      await passDone

      expect(widths()).toEqual([100, 100, 100])
    } finally {
      destroy()
    }
  })

  it("lays out no other item once an item's hook cancels the pass, and leaves that item dirty", () => {
    const { destroy, hookManager, spineItemsManager, spineLayout } =
      createTestSpineLayout({
        items: 4,
      })
    const itemsLaidOut: number[] = []
    let itemsLaidOutWhenCancelled: number[] | undefined

    hookManager.register("item.onBeforeLayout", ({ item }) => {
      itemsLaidOut.push(item.index)
    })
    hookManager.register("item.onAfterLayout", ({ item }) => {
      if (item.index !== 1 || itemsLaidOutWhenCancelled) return

      spineLayout.layout()
      itemsLaidOutWhenCancelled = [...itemsLaidOut]
    })

    try {
      spineLayout.layout({ immediate: true })

      expect(itemsLaidOutWhenCancelled).toEqual([0, 1])
      expect(itemsLaidOut).toEqual(itemsLaidOutWhenCancelled)
      expect(
        spineItemsManager.items.map((item) => item.value.isDirty),
        "the dirty items",
      ).toEqual([true, true, true, true])
    } finally {
      destroy()
    }
  })

  it.each([
    {
      renderers: "every item laid out at once",
      isFirstItemLaidOutLater: false,
    },
    {
      renderers: "the first item laid out later, and the others at once",
      isFirstItemLaidOutLater: true,
    },
  ])(
    "lays each item of a long spine out from the same depth of the call stack, with $renderers",
    async ({ isFirstItemLaidOutLater }) => {
      const { destroy, hookManager, spineItemsManager, spineLayout } =
        createTestSpineLayout({ items: 100 })
      const callStackDepthByItem: number[] = []
      const firstItemLayout = new Subject<ItemSize>()

      hookManager.register("item.onBeforeLayout", ({ item }) => {
        callStackDepthByItem[item.index] = getCallStackDepth()
      })

      if (isFirstItemLaidOutLater) {
        const [firstItem] = spineItemsManager.items

        if (!firstItem) throw new Error("the spine has no item")

        vi.spyOn(firstItem.renderer, "onLayout").mockReturnValue(
          firstItemLayout,
        )
      }

      try {
        const passDone = firstValueFrom(spineLayout.layout$)

        spineLayout.layout({ immediate: true })
        firstItemLayout.next({ height: 100, width: 100 })
        firstItemLayout.complete()
        await passDone

        const [, secondItemDepth = 0] = callStackDepthByItem

        expect(
          (callStackDepthByItem.at(-1) ?? 0) - secondItemDepth,
          "frames the call stack grew by from the second item to the last",
        ).toBe(0)
      } finally {
        destroy()
      }
    },
  )

  describe("Given an item whose layout fails", () => {
    const failure = new Error("the layout failed")

    it.each([
      {
        ending: "throws as it starts",
        arrangeFailure: (failingItem: SpineItem) => {
          vi.spyOn(failingItem.renderer, "onLayout").mockImplementation(() => {
            throw failure
          })
        },
        endFailingItemLayout: () => {},
        reportedErrors: [failure],
      },
      {
        ending: "fails later",
        arrangeFailure: () => {},
        endFailingItemLayout: ({
          failItemLayout,
        }: ReturnType<typeof createDeferredSpineLayout>) => {
          failItemLayout(1, failure)
        },
        reportedErrors: [failure],
      },
    ])(
      "lays it out at one page, and completes the pass, when its renderer $ending",
      async ({ arrangeFailure, endFailingItemLayout, reportedErrors }) => {
        const unhandledErrors = recordUnhandledErrors()
        const spineLayoutEnvironment = createDeferredSpineLayout(3)
        const {
          completeItemLayout,
          destroy,
          itemLayoutsStarted,
          items,
          lefts,
          spineLayout,
          widths,
        } = spineLayoutEnvironment
        const [, failingItem] = items

        if (!failingItem) throw new Error("the spine has no second item")

        arrangeFailure(failingItem)

        try {
          const passDone = firstValueFrom(spineLayout.layout$)

          spineLayout.layout({ immediate: true })
          completeItemLayout(0, { height: 100, width: 300 })
          endFailingItemLayout(spineLayoutEnvironment)

          expect(
            itemLayoutsStarted()[2],
            "the layouts of the item after the one that failed",
          ).toBe(1)

          completeItemLayout(2, { height: 100, width: 300 })
          await passDone

          expect(widths()).toEqual([300, 100, 300])
          expect(lefts()).toEqual([0, 300, 400])

          await waitFor(0)

          expect(unhandledErrors).toEqual(reportedErrors)
        } finally {
          destroy()
        }
      },
    )

    it.each(["item.onBeforeLayout", "item.onAfterLayout"] as const)(
      "lays it out at its size, and runs the hooks after it, when its %s hook throws",
      async (hookName) => {
        const unhandledErrors = recordUnhandledErrors()
        const {
          completeItemLayout,
          destroy,
          hookManager,
          itemLayoutsStarted,
          spineLayout,
          widths,
        } = createDeferredSpineLayout(3)
        const itemsOfTheNextHook: number[] = []

        hookManager.register(hookName, ({ item }) => {
          if (item.index === 1) throw failure
        })
        hookManager.register(hookName, ({ item }) => {
          itemsOfTheNextHook.push(item.index)
        })

        try {
          const passDone = firstValueFrom(spineLayout.layout$)

          spineLayout.layout({ immediate: true })

          for (const itemIndex of [0, 1, 2]) {
            expect(
              itemLayoutsStarted()[itemIndex],
              `the layouts of item ${itemIndex}`,
            ).toBe(1)

            completeItemLayout(itemIndex, { height: 100, width: 300 })
          }

          await passDone

          expect(widths()).toEqual([300, 300, 300])
          expect(itemsOfTheNextHook, "the items of the next hook").toEqual([
            0, 1, 2,
          ])

          await waitFor(0)

          expect(unhandledErrors).toEqual([failure])
        } finally {
          destroy()
        }
      },
    )

    it("gives it its minimum width, a whole spread, when its renderer fails in a spread", async () => {
      const unhandledErrors = recordUnhandledErrors()
      const { destroy, spineItemsManager, spineLayout } = createTestSpineLayout(
        {
          items: 3,
          initialSettings: { spreadMode: "always" },
          viewportSize: { height: 100, width: 200 },
        },
      )
      const [, failingItem] = spineItemsManager.items

      if (!failingItem) throw new Error("the spine has no second item")

      vi.spyOn(failingItem.renderer, "onLayout").mockImplementation(() => {
        throw failure
      })

      try {
        await layOutAndWait(spineLayout)

        expect(
          spineLayout.getSpineItemSpineLayoutInfo(1).width,
          "the width of its place",
        ).toBe(200)

        await waitFor(0)

        expect(unhandledErrors).toEqual([failure])
      } finally {
        destroy()
      }
    })

    it("lays it out at one page, and keeps it following its load, when its layout fails outside its renderer", async () => {
      const unhandledErrors = recordUnhandledErrors()
      const { destroy, spineItemsManager, spineLayout } = createTestSpineLayout(
        {
          items: 3,
          initialSettings: { spreadMode: "always" },
          viewportSize: { height: 100, width: 200 },
        },
      )
      const [, failingItem] = spineItemsManager.items

      if (!failingItem) throw new Error("the spine has no second item")

      // A renderer's own getter, read for the spread, fails in the item's
      // layout but outside its renderer's layout, on every layout.
      vi.spyOn(
        failingItem.renderer,
        "renditionLayout",
        "get",
      ).mockImplementation(() => {
        throw failure
      })

      const stages = recordLayoutStages(spineLayout)

      try {
        spineLayout.layout({ immediate: true })

        expect(stages, "the stages of the layout").toEqual([
          "requested",
          "layingOut",
          "laidOut",
        ])

        expect(
          spineLayout.getSpineItemSpineLayoutInfo(1).width,
          "the width of its place",
        ).toBe(100)
        expect(failingItem.value.isDirty, "the item is dirty").toBe(false)

        failingItem.load()

        await vi.waitFor(() => {
          expect(failingItem.value.loadStatus, "the item's load").toBe("loaded")
        })
        await waitFor(0)

        expect(unhandledErrors).toEqual([failure])
      } finally {
        destroy()
      }
    })
  })

  it("goes back to the requested state when its pass fails before laying the items out, and lays the spine out on the next request", async () => {
    const unhandledErrors = recordUnhandledErrors()
    const failure = new Error("the pass failed")
    const { destroy, layOutSpine, spineLayout, viewport } =
      createDeferredSpineLayout(3)
    const stages = recordLayoutStages(spineLayout)

    vi.spyOn(viewport, "layout").mockImplementationOnce(() => {
      throw failure
    })

    try {
      spineLayout.layout({ immediate: true })

      expect(stages, "the stages of the layout").toEqual([
        "requested",
        "requested",
      ])

      await layOutSpine({ height: 100, width: 100 })

      expect(stages, "the stages of the layout").toEqual([
        "requested",
        "requested",
        "requested",
        "layingOut",
        "laidOut",
      ])

      await waitFor(0)

      expect(unhandledErrors).toEqual([failure])
    } finally {
      destroy()
    }
  })

  it.each([
    {
      renderer: "gives two sizes",
      firstItemSizes: of(
        { height: 100, width: 300 },
        { height: 100, width: 500 },
      ),
      firstItemWidth: 300,
    },
    {
      renderer: "completes with no size",
      firstItemSizes: EMPTY,
      firstItemWidth: 100,
    },
  ])(
    "takes one size for an item whose renderer $renderer, for its place and its container",
    async ({ firstItemSizes, firstItemWidth }) => {
      const { destroy, spineItemsManager, spineLayout } = createTestSpineLayout(
        {
          items: 2,
        },
      )
      const [firstItem] = spineItemsManager.items

      if (!firstItem) throw new Error("the spine has no item")

      vi.spyOn(firstItem.renderer, "onLayout").mockReturnValue(firstItemSizes)

      try {
        await layOutAndWait(spineLayout)

        expect(
          spineItemsManager.items.map((_, itemIndex) => {
            const { left, width } =
              spineLayout.getSpineItemSpineLayoutInfo(itemIndex)

            return { left, width }
          }),
          "the places of the items",
        ).toEqual([
          { left: 0, width: firstItemWidth },
          { left: firstItemWidth, width: 100 },
        ])
        expect(firstItem.layoutInfo.width, "the width of its container").toBe(
          firstItemWidth,
        )
      } finally {
        destroy()
      }
    },
  )

  it("goes back to the requested state when its pass fails while laying the items out, and lays the spine out on the next request", async () => {
    const unhandledErrors = recordUnhandledErrors()
    const failure = new Error("the pass failed")
    const { destroy, spineItemsManager, spineLayout } = createTestSpineLayout({
      items: 3,
    })
    const [, secondItem] = spineItemsManager.items
    const stages = recordLayoutStages(spineLayout)

    if (!secondItem) throw new Error("the spine has no second item")

    // Out of the guard of the item's own layout, as a bug of the pass would be.
    vi.spyOn(secondItem, "layout").mockImplementationOnce(() => {
      throw failure
    })

    try {
      spineLayout.layout({ immediate: true })

      expect(stages, "the stages of the layout").toEqual([
        "requested",
        "layingOut",
        "requested",
      ])

      await layOutAndWait(spineLayout)

      expect(stages, "the stages of the layout").toEqual([
        "requested",
        "layingOut",
        "requested",
        "requested",
        "layingOut",
        "laidOut",
      ])

      await waitFor(0)

      expect(unhandledErrors).toEqual([failure])
    } finally {
      destroy()
    }
  })

  it("stops the layout of an item when a newer request cancels its pass, and leaves the item dirty until the newer pass lays it out", async () => {
    const {
      completeItemLayout,
      destroy,
      dirtyFlags,
      hookManager,
      itemLayoutsStarted,
      spineLayout,
      widths,
    } = createDeferredSpineLayout(3)
    const itemsLaidOut: number[] = []

    hookManager.register("item.onAfterLayout", ({ item }) => {
      itemsLaidOut.push(item.index)
    })

    try {
      spineLayout.layout({ immediate: true })
      // Waits before its pass, so the first item's layout ends in between.
      spineLayout.layout()
      completeItemLayout(0, { height: 100, width: 100 })

      expect(itemsLaidOut, "the items laid out").toEqual([])
      expect(dirtyFlags(), "the dirty items").toEqual([true, true, true])

      await vi.waitFor(() => {
        expect(itemLayoutsStarted()[0], "the layouts of the first item").toBe(2)
      })

      const passDone = firstValueFrom(spineLayout.layout$)

      for (const itemIndex of [0, 1, 2]) {
        completeItemLayout(itemIndex, { height: 100, width: 200 })
      }

      await passDone

      expect(itemsLaidOut, "the items laid out").toEqual([0, 1, 2])
      expect(dirtyFlags(), "the dirty items").toEqual([false, false, false])
      expect(widths()).toEqual([200, 200, 200])
    } finally {
      destroy()
    }
  })

  it("keeps RTL right-left spread pairs together after an odd number of pages", async () => {
    const { destroy, layoutRequests, spineLayout } =
      createSpreadModeTestEnvironment({
        pageHeight: 100,
        pageWidth: 100,
        readingDirection: "rtl",
        items: [
          undefined,
          undefined,
          undefined,
          { pageSpreadRight: true, renditionLayout: "pre-paginated" },
          { pageSpreadLeft: true, renditionLayout: "pre-paginated" },
        ],
      })

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(layoutRequests.find(({ id }) => id === "item-3")).toEqual({
        blankPagePosition: "before",
        id: "item-3",
        minimumWidth: 200,
      })
      expect(layoutRequests.find(({ id }) => id === "item-4")).toEqual({
        blankPagePosition: "none",
        id: "item-4",
        minimumWidth: 100,
      })
      expect(spineLayout.getSpineItemSpineLayoutInfo(3).width).toBe(200)
      expect(spineLayout.getSpineItemSpineLayoutInfo(4).width).toBe(100)
    } finally {
      destroy()
    }
  })

  it("keeps LTR left-right spread pairs together after an odd number of pages", async () => {
    const { destroy, layoutRequests, spineLayout } =
      createSpreadModeTestEnvironment({
        pageHeight: 100,
        pageWidth: 100,
        readingDirection: "ltr",
        items: [
          undefined,
          undefined,
          undefined,
          { pageSpreadLeft: true, renditionLayout: "pre-paginated" },
          { pageSpreadRight: true, renditionLayout: "pre-paginated" },
        ],
      })

    try {
      const layoutDone = firstValueFrom(spineLayout.layout$)

      spineLayout.layout({ immediate: true })
      await layoutDone

      expect(layoutRequests.find(({ id }) => id === "item-3")).toEqual({
        blankPagePosition: "before",
        id: "item-3",
        minimumWidth: 200,
      })
      expect(layoutRequests.find(({ id }) => id === "item-4")).toEqual({
        blankPagePosition: "none",
        id: "item-4",
        minimumWidth: 100,
      })
      expect(spineLayout.getSpineItemSpineLayoutInfo(3).width).toBe(200)
      expect(spineLayout.getSpineItemSpineLayoutInfo(4).width).toBe(100)
    } finally {
      destroy()
    }
  })
})
