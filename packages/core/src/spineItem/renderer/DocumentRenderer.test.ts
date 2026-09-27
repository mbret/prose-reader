import type { Manifest } from "@prose-reader/shared"
import { EMPTY, of, Subject } from "rxjs"
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createTestManifest, waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { ResourceHandler } from "../resources/ResourceHandler"
import { DocumentRenderer } from "./DocumentRenderer"

class TestRenderer extends DocumentRenderer {
  /** The document load of the latest `load()`, a new one each time. */
  public onLoadDocumentSubject = new Subject<void>()
  public onUnloadCalls = 0

  onUnload() {
    this.onUnloadCalls++

    return EMPTY
  }

  onCreateDocument() {
    const element = document.createElement("div")

    this.setDocumentContainer(element)

    return of(element)
  }

  onLoadDocument() {
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

const createHarness = () => {
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

  const renderer = new TestRenderer({
    context,
    settings,
    hookManager,
    item,
    containerElement,
    resourcesHandler,
    viewport,
  })

  return {
    context,
    settings,
    viewport,
    hookManager,
    renderer,
    item,
    cleanup: () => {
      renderer.destroy()
      viewport.destroy()
      settings.destroy()
      context.destroy()
    },
  }
}

describe(`DocumentRenderer`, () => {
  describe(`when unload races a pending item.onDocumentLoad hook`, () => {
    it(`aborts the in-flight load hook execution`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      let capturedSignal: AbortSignal | undefined
      let resolveHook: (() => void) | undefined

      hookManager.register(
        `item.onDocumentLoad`,
        ({ signal }) =>
          new Promise<void>((resolve) => {
            capturedSignal = signal
            resolveHook = resolve
          }),
      )

      renderer.load()
      renderer.onLoadDocumentSubject.next()
      renderer.onLoadDocumentSubject.complete()

      await waitFor(0)

      expect(capturedSignal).toBeDefined()
      expect(capturedSignal?.aborted).toBe(false)
      expect(hookManager._hookExecutions).toHaveLength(1)

      renderer.unload()

      expect(capturedSignal?.aborted).toBe(true)
      expect(hookManager._hookExecutions).toHaveLength(0)

      resolveHook?.()
      cleanup()
    })
  })

  describe(`when the renderer is destroyed while loaded`, () => {
    it(`synchronously runs the unload hook before onUnload, exactly once`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      const unloadedItemIds: string[] = []
      let onUnloadCallsWhenHookRan: number | undefined

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        onUnloadCallsWhenHookRan = renderer.onUnloadCalls
        unloadedItemIds.push(itemId)
      })

      renderer.load()
      renderer.onLoadDocumentSubject.next()
      renderer.onLoadDocumentSubject.complete()

      await waitFor(0)

      expect(renderer.value.state).toBe(`loaded`)

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
    })
  })

  describe(`when the renderer is destroyed without having loaded`, () => {
    it(`does not run any unload step`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      const unloadedItemIds: string[] = []

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })

      renderer.destroy()

      await waitFor(0)

      expect(renderer.onUnloadCalls).toBe(0)
      expect(unloadedItemIds).toEqual([])

      cleanup()
    })
  })

  describe(`when a load fails`, () => {
    it(`is in error with what it created released, stays in error on the next load(), and loads once unloaded`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      const unloadedItemIds: string[] = []
      const loadedErrors: unknown[] = []
      let loadedCount = 0

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })
      renderer.loaded$.subscribe({
        next: () => {
          loadedCount++
        },
        error: (error) => {
          loadedErrors.push(error)
        },
      })

      const loadError = new Error(`resource failed`)

      renderer.load()
      renderer.onLoadDocumentSubject.error(loadError)

      await waitFor(0)

      // The failure is the renderer's state, and what the load created is
      // released, as an unload would.
      expect(renderer.value.state).toBe(`error`)
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

      expect(renderer.value.state).toBe(`error`)

      // An unload leaves it idle, and the next load loads.
      renderer.unload()
      renderer.load()
      renderer.onLoadDocumentSubject.next()
      renderer.onLoadDocumentSubject.complete()

      await waitFor(0)

      // `loaded$` never errors: it goes on, and reports the load that works.
      expect(renderer.value.state).toBe(`loaded`)
      expect(loadedCount).toBe(1)
      expect(loadedErrors).toEqual([])

      cleanup()
    })
  })

  describe(`when an item whose load failed is unloaded or destroyed`, () => {
    it(`releases nothing more, and is idle once unloaded`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      const unloadedItemIds: string[] = []

      hookManager.register(`item.onDocumentUnload`, ({ itemId }) => {
        unloadedItemIds.push(itemId)
      })

      renderer.load()
      renderer.onLoadDocumentSubject.error(new Error(`resource failed`))

      await waitFor(0)

      expect(renderer.value.state).toBe(`error`)
      expect(renderer.onUnloadCalls).toBe(1)

      // The failed load released what it created, once: the unload and the
      // destroy that follow have nothing left to release.
      renderer.unload()

      await waitFor(0)

      expect(renderer.value.state).toBe(`idle`)
      expect(renderer.value.error).toBeUndefined()

      renderer.load()
      renderer.onLoadDocumentSubject.error(new Error(`resource failed`))

      await waitFor(0)

      renderer.destroy()

      expect(renderer.onUnloadCalls).toBe(2)
      expect(unloadedItemIds).toEqual([`item-1`, `item-1`])

      cleanup()
    })
  })

  describe(`when the load hook completes naturally`, () => {
    it(`does not abort and leaves no pending execution`, async () => {
      const { renderer, hookManager, cleanup } = createHarness()

      let capturedSignal: AbortSignal | undefined

      hookManager.register(`item.onDocumentLoad`, async ({ signal }) => {
        capturedSignal = signal
      })

      renderer.load()
      renderer.onLoadDocumentSubject.next()
      renderer.onLoadDocumentSubject.complete()

      await waitFor(0)

      expect(capturedSignal?.aborted).toBe(false)
      expect(hookManager._hookExecutions).toHaveLength(0)

      cleanup()
    })
  })
})
