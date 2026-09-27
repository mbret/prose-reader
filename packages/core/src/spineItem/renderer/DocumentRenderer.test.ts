import type { Manifest } from "@prose-reader/shared"
import { EMPTY, of, Subject } from "rxjs"
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createTestManifest, waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { ResourceHandler } from "../resources/ResourceHandler"
import { type DocumentLoadStatus, DocumentRenderer } from "./DocumentRenderer"

/**
 * Creates a new document each time, named by the order it was created in, and
 * attaches it once it loads and detaches it when unloaded, as the renderers
 * do.
 */
class TestRenderer extends DocumentRenderer {
  /** The document load of the latest `load()`, a new one each time. */
  public onLoadDocumentSubject = new Subject<void>()
  /** Every document `onCreateDocument` created, by name, in order. */
  public createdDocuments: string[] = []
  /** The document each `onUnload` released, by name, in order. */
  public releasedDocuments: Array<string | undefined> = []
  /** Every document still held, not released yet, each time one is created. */
  public documentsHeldOnCreation: string[] = []

  get onUnloadCalls() {
    return this.releasedDocuments.length
  }

  onUnload() {
    this.releasedDocuments.push(this.documentContainer?.id)
    this.detach()
  }

  onCreateDocument() {
    this.documentsHeldOnCreation.push(
      ...this.createdDocuments.filter(
        (name) => !this.releasedDocuments.includes(name),
      ),
    )

    const element = document.createElement("div")

    element.id = `document-${this.createdDocuments.length + 1}`
    this.createdDocuments.push(element.id)
    this.setDocumentContainer(element)

    return of(element)
  }

  onLoadDocument() {
    this.attach()
    this.onLoadDocumentSubject = new Subject<void>()

    return this.onLoadDocumentSubject.asObservable()
  }

  onLayout() {
    return of(undefined)
  }

  onRenderHeadless() {
    return EMPTY
  }

  getDocumentFrame() {
    return undefined
  }
}

/** Keeps no document container, as the default renderer does. */
class ContainerlessRenderer extends TestRenderer {
  onCreateDocument() {
    return of(document.createElement("div"))
  }
}

const createHarness = (Renderer: typeof TestRenderer = TestRenderer) => {
  const context = new Context(createTestManifest())
  const settings = new ReaderSettingsManager({}, context)
  const viewport = new Viewport(context, settings)
  const hookManager = new HookManager()
  const containerElement = document.createElement("div")
  const item: Manifest[`spineItems`][number] = {
    id: `item-1`,
    index: 0,
    href: `item-1.xhtml`,
    mediaType: `application/xhtml+xml`,
  }
  const resourcesHandler = new ResourceHandler(item, settings)

  const renderer = new Renderer({
    context,
    settings,
    hookManager,
    item,
    containerElement,
    resourcesHandler,
    viewport,
  })

  /** The document each `item.onDocumentUnload` ran on, by name, in order. */
  const documentsUnloadHooksRanOn: string[] = []

  hookManager.register(`item.onDocumentUnload`, ({ documentContainer }) => {
    documentsUnloadHooksRanOn.push(documentContainer.id)
  })

  return {
    context,
    settings,
    viewport,
    hookManager,
    renderer,
    item,
    containerElement,
    setViewportState: (state: `free` | `busy`) => {
      context.bridgeEvent.viewportStateSubject.next(state)
    },
    /**
     * Every document the renderer created was released exactly once, by the
     * unload hooks and `onUnload`, and none was created while another was
     * still held.
     */
    expectEveryDocumentReleasedOnce: () => {
      expect(renderer.documentsHeldOnCreation).toEqual([])
      expect(renderer.releasedDocuments).toEqual(renderer.createdDocuments)
      expect(documentsUnloadHooksRanOn).toEqual(renderer.createdDocuments)
    },
    cleanup: () => {
      renderer.destroy()
      viewport.destroy()
      settings.destroy()
      context.destroy()
    },
  }
}

/** Completes the document load of the latest `load()`, and its load hooks. */
const completeDocumentLoad = async (renderer: TestRenderer) => {
  renderer.onLoadDocumentSubject.next()
  renderer.onLoadDocumentSubject.complete()

  // The load hooks run asynchronously, even when none is registered.
  await waitFor(0)
}

describe(`DocumentRenderer`, () => {
  describe(`when unload races a pending item.onDocumentLoad hook`, () => {
    it(`aborts the in-flight load hook execution, before the document is released`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      let capturedSignal: AbortSignal | undefined
      let resolveHook: (() => void) | undefined
      let isLoadAbortedWhenUnloadHookRan: boolean | undefined

      hookManager.register(
        `item.onDocumentLoad`,
        ({ signal }) =>
          new Promise<void>((resolve) => {
            capturedSignal = signal
            resolveHook = resolve
          }),
      )
      hookManager.register(`item.onDocumentUnload`, () => {
        isLoadAbortedWhenUnloadHookRan = capturedSignal?.aborted
      })

      renderer.load()
      await completeDocumentLoad(renderer)

      expect(capturedSignal).toBeDefined()
      expect(capturedSignal?.aborted).toBe(false)
      expect(hookManager._hookExecutions).toHaveLength(1)

      renderer.unload()

      expect(capturedSignal?.aborted).toBe(true)
      expect(hookManager._hookExecutions).toHaveLength(0)
      // A document is never released while its load still runs.
      expect(isLoadAbortedWhenUnloadHookRan).toBe(true)
      expect(renderer.value.loadStatus).toBe(`idle`)

      resolveHook?.()
      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when the renderer is destroyed while an item.onDocumentLoad hook runs`, () => {
    it(`aborts it, before the document is released`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      let capturedSignal: AbortSignal | undefined
      let isLoadAbortedWhenUnloadHookRan: boolean | undefined

      hookManager.register(
        `item.onDocumentLoad`,
        ({ signal }) =>
          new Promise<void>(() => {
            capturedSignal = signal
          }),
      )
      hookManager.register(`item.onDocumentUnload`, () => {
        isLoadAbortedWhenUnloadHookRan = capturedSignal?.aborted
      })

      renderer.load()
      await completeDocumentLoad(renderer)

      expect(capturedSignal?.aborted).toBe(false)

      renderer.destroy()

      expect(isLoadAbortedWhenUnloadHookRan).toBe(true)
      expect(renderer.releasedDocuments).toEqual([`document-1`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a load is asked for again`, () => {
    it(`goes on loading the document it has, then keeps it`, async () => {
      const { renderer, cleanup, expectEveryDocumentReleasedOnce } =
        createHarness()

      renderer.load()
      renderer.load()

      expect(renderer.value.loadStatus).toBe(`loading`)

      await completeDocumentLoad(renderer)

      expect(renderer.value.loadStatus).toBe(`loaded`)

      renderer.load()

      expect(renderer.value.loadStatus).toBe(`loaded`)
      expect(renderer.createdDocuments).toEqual([`document-1`])
      expect(renderer.releasedDocuments).toEqual([])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when the renderer is destroyed while loaded`, () => {
    it(`synchronously runs the unload hook before onUnload, exactly once`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      const unloadedItemIds: string[] = []
      let onUnloadCallsWhenHookRan: number | undefined

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        onUnloadCallsWhenHookRan = renderer.onUnloadCalls
        unloadedItemIds.push(itemId)
      })

      renderer.load()
      await completeDocumentLoad(renderer)

      expect(renderer.value.loadStatus).toBe(`loaded`)

      renderer.destroy()

      // the hook runs synchronously within destroy, before onUnload tears the
      // document down (so it still sees a live document)
      expect(unloadedItemIds).toEqual([`item-1`])
      expect(onUnloadCallsWhenHookRan).toBe(0)
      expect(renderer.onUnloadCalls).toBe(1)

      // destroy is idempotent
      renderer.destroy()

      await waitFor(0)

      expect(renderer.onUnloadCalls).toBe(1)
      expect(unloadedItemIds).toEqual([`item-1`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })

    it(`lets what observes the document container see it go, before the state completes`, async () => {
      const { renderer, cleanup, expectEveryDocumentReleasedOnce } =
        createHarness()

      renderer.load()
      await completeDocumentLoad(renderer)

      const observedDocumentContainers: Array<string | undefined> = []
      let isDocumentContainerWatchComplete = false

      renderer.watch(`documentContainer`).subscribe({
        next: (documentContainer) => {
          observedDocumentContainers.push(documentContainer?.id)
        },
        complete: () => {
          isDocumentContainerWatchComplete = true
        },
      })

      renderer.destroy()

      // A view rendered into the container, as react-reader's audio items
      // are, is removed rather than left in a released container.
      expect(observedDocumentContainers).toEqual([`document-1`, undefined])
      expect(isDocumentContainerWatchComplete).toBe(true)

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a renderer that keeps no document container is destroyed while loaded`, () => {
    it(`releases the load, as an unload does`, async () => {
      const { renderer, cleanup } = createHarness(ContainerlessRenderer)

      renderer.load()
      await completeDocumentLoad(renderer)
      renderer.unload()

      expect(renderer.onUnloadCalls).toBe(1)

      renderer.load()
      await completeDocumentLoad(renderer)
      renderer.destroy()

      expect(renderer.onUnloadCalls).toBe(2)

      cleanup()
    })
  })

  describe(`when the renderer is destroyed without having loaded`, () => {
    it(`does not run any unload step`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      const unloadedItemIds: string[] = []

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })

      renderer.destroy()

      await waitFor(0)

      expect(renderer.onUnloadCalls).toBe(0)
      expect(unloadedItemIds).toEqual([])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when the renderer is destroyed while an unload waits for the viewport`, () => {
    it(`releases the document once, and not again when the viewport is free`, async () => {
      const {
        renderer,
        setViewportState,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      renderer.load()
      await completeDocumentLoad(renderer)

      setViewportState(`busy`)
      renderer.unload()
      renderer.destroy()

      expect(renderer.releasedDocuments).toEqual([`document-1`])

      setViewportState(`free`)

      expect(renderer.releasedDocuments).toEqual([`document-1`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a load is asked for while destroy releases the document`, () => {
    it(`creates no document, and releases the document once`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      hookManager.register(`item.onDocumentUnload`, () => {
        renderer.load()
      })

      renderer.load()
      await completeDocumentLoad(renderer)
      renderer.destroy()

      expect(renderer.createdDocuments).toEqual([`document-1`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a load is asked for once the renderer is destroyed`, () => {
    it(`creates no document`, () => {
      const { renderer, cleanup, expectEveryDocumentReleasedOnce } =
        createHarness()

      renderer.destroy()
      renderer.load()

      expect(renderer.createdDocuments).toEqual([])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a load is asked for while an unload waits for the viewport`, () => {
    it(`releases the loaded document once the viewport is free, then loads a new one`, async () => {
      const {
        renderer,
        setViewportState,
        containerElement,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      renderer.load()
      await completeDocumentLoad(renderer)

      setViewportState(`busy`)
      renderer.unload()
      renderer.load()

      // The release waits for the viewport, and the load for the release.
      expect(renderer.createdDocuments).toEqual([`document-1`])
      expect(renderer.releasedDocuments).toEqual([])
      expect(renderer.value.loadStatus).toBe(`unloading`)

      setViewportState(`free`)

      expect(renderer.releasedDocuments).toEqual([`document-1`])
      expect(renderer.createdDocuments).toEqual([`document-1`, `document-2`])
      expect(renderer.value.loadStatus).toBe(`loading`)

      await completeDocumentLoad(renderer)

      expect(renderer.value.loadStatus).toBe(`loaded`)
      expect(renderer.documentContainer?.id).toBe(`document-2`)
      expect(
        Array.from(containerElement.children, (element) => element.id),
      ).toEqual([`document-2`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })

    it(`releases a document whose load the unload cancelled, then loads a new one`, async () => {
      const {
        renderer,
        setViewportState,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      renderer.load()

      expect(renderer.value.loadStatus).toBe(`loading`)

      setViewportState(`busy`)
      renderer.unload()
      renderer.load()

      expect(renderer.createdDocuments).toEqual([`document-1`])
      expect(renderer.value.loadStatus).toBe(`unloading`)

      setViewportState(`free`)

      expect(renderer.releasedDocuments).toEqual([`document-1`])
      expect(renderer.createdDocuments).toEqual([`document-1`, `document-2`])

      await completeDocumentLoad(renderer)

      expect(renderer.value.loadStatus).toBe(`loaded`)
      expect(renderer.documentContainer?.id).toBe(`document-2`)

      cleanup()
      expectEveryDocumentReleasedOnce()
    })

    it(`does not load when an unload is asked for again before the viewport is free`, async () => {
      const {
        renderer,
        setViewportState,
        containerElement,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      renderer.load()
      await completeDocumentLoad(renderer)

      setViewportState(`busy`)
      renderer.unload()
      renderer.load()
      renderer.unload()
      setViewportState(`free`)

      expect(renderer.value.loadStatus).toBe(`idle`)
      expect(renderer.createdDocuments).toEqual([`document-1`])
      expect(renderer.releasedDocuments).toEqual([`document-1`])
      expect(containerElement.children).toHaveLength(0)

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when a load fails`, () => {
    it(`is in error with what it created released, stays in error on the next load(), and loads once unloaded`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      const unloadedItemIds: string[] = []
      const loadStatuses: DocumentLoadStatus[] = []

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })
      renderer.watch(`loadStatus`).subscribe((loadStatus) => {
        loadStatuses.push(loadStatus)
      })

      const loadError = new Error(`resource failed`)

      renderer.load()
      renderer.onLoadDocumentSubject.error(loadError)

      await waitFor(0)

      // The failure is the renderer's state, and what the load created is
      // released, as an unload would.
      expect(renderer.value.loadStatus).toBe(`error`)
      expect(renderer.value.error).toBe(loadError)
      expect(unloadedItemIds).toEqual([`item-1`])
      expect(renderer.onUnloadCalls).toBe(1)

      /**
       * A load is a request, which a failed load does not retry: the loader
       * asks for every item it wants loaded after each layout, and a failure
       * lays the spine out.
       */
      renderer.load()

      await waitFor(0)

      expect(renderer.value.loadStatus).toBe(`error`)

      // An unload leaves it idle, and the next load loads.
      renderer.unload()
      renderer.load()
      await completeDocumentLoad(renderer)

      // The failure did not end the renderer's loads: the one that works goes
      // through, and the request made in error started none.
      expect(loadStatuses).toEqual([
        `idle`,
        `loading`,
        `error`,
        `idle`,
        `loading`,
        `loaded`,
      ])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when an item whose load failed is unloaded or destroyed`, () => {
    it(`releases nothing more, and is idle once unloaded`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      const unloadedItemIds: string[] = []

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })

      renderer.load()
      renderer.onLoadDocumentSubject.error(new Error(`resource failed`))

      await waitFor(0)

      expect(renderer.value.loadStatus).toBe(`error`)
      expect(renderer.onUnloadCalls).toBe(1)

      // The failed load released what it created, once: the unload and the
      // destroy that follow have nothing left to release.
      renderer.unload()

      await waitFor(0)

      expect(renderer.value.loadStatus).toBe(`idle`)
      expect(renderer.value.error).toBeUndefined()

      renderer.load()
      renderer.onLoadDocumentSubject.error(new Error(`resource failed`))

      await waitFor(0)

      renderer.destroy()

      expect(renderer.onUnloadCalls).toBe(2)
      expect(unloadedItemIds).toEqual([`item-1`, `item-1`])

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })

  describe(`when the load hook completes naturally`, () => {
    it(`does not abort and leaves no pending execution`, async () => {
      const {
        renderer,
        hookManager,
        cleanup,
        expectEveryDocumentReleasedOnce,
      } = createHarness()

      let capturedSignal: AbortSignal | undefined

      hookManager.register(`item.onDocumentLoad`, async ({ signal }) => {
        capturedSignal = signal
      })

      renderer.load()
      await completeDocumentLoad(renderer)

      expect(capturedSignal?.aborted).toBe(false)
      expect(hookManager._hookExecutions).toHaveLength(0)

      cleanup()
      expectEveryDocumentReleasedOnce()
    })
  })
})
