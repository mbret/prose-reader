import type { Manifest } from "@prose-reader/shared"
import { EMPTY, of, Subject } from "rxjs"
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { ResourceHandler } from "../resources/ResourceHandler"
import { DocumentRenderer } from "./DocumentRenderer"

class TestRenderer extends DocumentRenderer {
  public readonly onLoadDocumentSubject = new Subject<void>()

  onUnload() {
    return EMPTY
  }

  onCreateDocument() {
    return of(document.createElement("div"))
  }

  onLoadDocument() {
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
  const context = new Context()
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
