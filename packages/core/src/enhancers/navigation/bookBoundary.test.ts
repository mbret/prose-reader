import { BehaviorSubject } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { createNavigator } from "../../navigation/Navigator"
import { generateItems } from "../../navigation/tests/utils"
import { Pagination } from "../../pagination/Pagination"
import type { Reader } from "../../reader"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import {
  type BookBoundaryReachedEvent,
  observeBookBoundaryReached,
} from "./bookBoundary"

/**
 * Force the last spine item's `isReady$` to a controllable subject so the
 * tests can simulate "loading" vs "ready" without going through the real
 * renderer pipeline.
 */
const overrideLastItemReadiness = (
  spineItemsManager: SpineItemsManager,
  initial: boolean,
) => {
  const items = spineItemsManager.items
  const lastItem = items[items.length - 1]
  if (!lastItem) throw new Error("No spine items to override readiness on")

  const subject = new BehaviorSubject<boolean>(initial)

  vi.spyOn(lastItem, "isReady$", "get").mockReturnValue(subject.asObservable())
  vi.spyOn(lastItem, "value", "get").mockReturnValue({
    ...lastItem.value,
    isReady: initial,
  })

  return {
    setReady(ready: boolean) {
      subject.next(ready)
      vi.spyOn(lastItem, "value", "get").mockReturnValue({
        ...lastItem.value,
        isReady: ready,
      })
    },
  }
}

const createTestReader = ({
  itemSize = 100,
  itemCount = 2,
}: {
  itemSize?: number
  itemCount?: number
} = {}) => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const spineItemsManager = new SpineItemsManager(context, settings)
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const pagination = new Pagination(context, spineItemsManager)
  const spineItemLocator = createSpineItemLocator({
    context,
    settings,
    viewport,
  })
  const spine = new Spine(
    context,
    pagination,
    spineItemsManager,
    spineItemLocator,
    settings,
    hookManager,
    viewport,
  )
  const navigator = createNavigator({
    context,
    settings,
    spineItemsManager,
    hookManager,
    spine,
    viewport,
  })

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
    itemSize,
  )
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(
    itemSize,
  )
  viewport.layout()

  // biome-ignore lint/suspicious/noExplicitAny: minimal manifest mock for unit tests
  const fakeManifest = { readingDirection: "ltr", spineItems: [] } as any
  context.update({ manifest: fakeManifest })

  const items = generateItems(
    itemSize,
    itemCount,
    context,
    settings,
    hookManager,
    spine,
    spineItemsManager,
    viewport,
  )
  spineItemsManager.addMany(items)

  const reader = {
    navigation: navigator,
    spineItemsManager,
    spine,
    context,
  } as unknown as Reader

  return { reader, navigator, spine, context, settings, spineItemsManager }
}

describe("observeBookBoundaryReached", () => {
  describe("Given the last spine item is already ready", () => {
    it("emits 'end' immediately when navigation overshoots the spine right edge", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      overrideLastItemReadiness(spineItemsManager, true)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader).subscribe((e) =>
        events.push(e),
      )

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      subscription.unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })
  })

  describe("Given the last spine item is loading", () => {
    it("withholds the 'end' event until the item becomes ready, then emits", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      const readiness = overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader).subscribe((e) =>
        events.push(e),
      )

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      expect(events).toEqual([]) // gated, nothing yet

      readiness.setReady(true)
      await waitFor(20)
      subscription.unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    it("drops the 'end' event when the item never becomes ready before the timeout", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader, {
        itemReadinessTimeoutMs: 30,
      }).subscribe((e) => events.push(e))

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      await waitFor(100)
      subscription.unsubscribe()

      expect(events).toEqual([])
    })

    // Regression: `setTimeout(fn, Infinity)` is clamped to ~1ms in Node, so
    // naively passing `Infinity` into RxJS `timeout` would drop the pending
    // event instead of waiting. The operator must be skipped entirely.
    it("waits indefinitely when itemReadinessTimeoutMs is Infinity", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      const readiness = overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader, {
        itemReadinessTimeoutMs: Number.POSITIVE_INFINITY,
      }).subscribe((e) => events.push(e))

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      // Wait long enough that a clamped `Infinity` timeout would have fired
      // and routed to `EMPTY`, completing the inner observable.
      await waitFor(100)
      expect(events).toEqual([]) // still pending, not dropped

      readiness.setReady(true)
      await waitFor(20)
      subscription.unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })
  })

  describe("Given the start side", () => {
    it("emits 'start' immediately, regardless of last-item readiness", async () => {
      // Start side never gates on readiness: x = 0 is always the start.
      const { reader, navigator, spineItemsManager } = createTestReader()
      overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader).subscribe((e) =>
        events.push(e),
      )

      navigator.navigate({
        position: new SpinePosition({ x: -10, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      subscription.unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })
  })

  describe("Given a fresh boundary while a previous wait is still pending", () => {
    it("cancels the pending wait and starts a new one (switchMap semantics)", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      const readiness = overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader).subscribe((e) =>
        events.push(e),
      )

      // First overshoot — gated.
      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })
      await waitFor(20)

      // Second overshoot before readiness arrives — should cancel the first wait.
      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })
      await waitFor(20)

      // Readiness arrives — only the latest wait should consume it.
      readiness.setReady(true)
      await waitFor(20)
      subscription.unsubscribe()

      // Both attempts produced settled navigations, but switchMap collapses
      // the in-flight readiness wait so we get exactly one emission.
      expect(events).toEqual([{ boundary: "end" }])
    })
  })
})
