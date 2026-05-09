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
    viewport,
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
      expect(events).toEqual([])

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
    // naively passing `Infinity` into RxJS `timeout` would drop the event
    // instead of waiting. The operator must be skipped entirely.
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

      // Long enough that a clamped `Infinity` timeout would have fired.
      await waitFor(100)
      expect(events).toEqual([])

      readiness.setReady(true)
      await waitFor(20)
      subscription.unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })
  })

  describe("Given the start side", () => {
    it("emits 'start' immediately, regardless of last-item readiness", async () => {
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

  describe("Given an in-bounds navigation arrives while an 'end' wait is pending", () => {
    /**
     * Regression: the wait used to be triggered only by boundary events,
     * so an in-bounds navigation couldn't cancel it. The pending wait
     * would then spuriously fire when readiness eventually arrived, even
     * though the user had since moved away from the edge. Driving the
     * `takeUntilNextNavigationSettled` ensures any later non-boundary
     * navigation tears down the pending wait.
     */
    it("cancels the pending wait so it does not fire when readiness eventually arrives", async () => {
      const { reader, navigator, spineItemsManager } = createTestReader()
      const readiness = overrideLastItemReadiness(spineItemsManager, false)

      const events: BookBoundaryReachedEvent[] = []
      const subscription = observeBookBoundaryReached(reader).subscribe((e) =>
        events.push(e),
      )

      // Overshoot end while loading — wait starts.
      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })
      await waitFor(20)
      expect(events).toEqual([])

      // User navigates back in-bounds before readiness arrives.
      navigator.navigate({
        position: new SpinePosition({ x: 0, y: 0 }),
        animation: false,
      })
      await waitFor(20)

      // Readiness arrives — the cancelled wait must not fire.
      readiness.setReady(true)
      await waitFor(50)
      subscription.unsubscribe()

      expect(events).toEqual([])
    })
  })
})
