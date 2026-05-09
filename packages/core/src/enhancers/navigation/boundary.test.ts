import { firstValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { createNavigator } from "../../navigation/Navigator"
import { observeSettledNavigation } from "../../navigation/operators"
import { generateItems } from "../../navigation/tests/utils"
import { Pagination } from "../../pagination/Pagination"
import type { Reader } from "../../reader"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import {
  SpineItemSpineLayout,
  SpinePosition,
  UnboundSpinePosition,
} from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { waitFor } from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { type BoundaryReachedEvent, outOfSpineBoundary } from "./boundary"

const createTestReader = ({
  itemSize = 100,
  itemCount = 2,
  readingDirection = "ltr",
}: {
  itemSize?: number
  itemCount?: number
  readingDirection?: "ltr" | "rtl"
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

  // biome-ignore lint/suspicious/noExplicitAny: minimal Reader mock for unit tests
  const fakeManifest = { readingDirection, spineItems: [] } as any
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

  // Cast: only the fields read by `outOfSpineBoundary` are wired up.
  const reader = {
    navigation: navigator,
    spineItemsManager,
    spine,
    context,
    viewport,
  } as unknown as Reader

  return { reader, navigator, spine, context, settings, viewport, items }
}

const collectBoundaries = (reader: Reader) => {
  const events: BoundaryReachedEvent[] = []
  const subscription = outOfSpineBoundary(reader).subscribe((event) => {
    events.push(event)
  })
  return { events, unsubscribe: () => subscription.unsubscribe() }
}

describe("outOfSpineBoundary", () => {
  describe("Given an LTR horizontal book", () => {
    it("does not emit for an in-bounds navigation", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 0, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([])
    })

    it("emits 'end' when the requested x is past the spine right edge", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    it("emits 'end' when the requested x is exactly at layout.right (a full viewport past the last valid position)", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 200, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    /**
     * Regression: `requested.x` is the viewport's left edge, so the user
     * is past end as soon as `x > layout.right - viewport.width` (the
     * viewport's right edge crosses the spine's right edge). A previous
     * implementation compared `x >= layout.right` instead, which never
     * fired during a real pan past end — typical pan motion only inches
     * `x` forward by a few pixels at a time, so it sat in the
     * `(xMax, layout.right)` gap and the boundary detector stayed silent.
     */
    it("emits 'end' on a pan past the right edge whose x falls between xMax and layout.right", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 150, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    it("does NOT emit when the requested x is exactly at xMax (the last valid position of the last LTR spine item)", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 100, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([])
    })

    it("emits 'start' when the requested x is negative", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: -10, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })

    it("emits 'start' when the requested y is negative", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 0, y: -10 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })

    it("does not emit for a CFI-only navigation (no requestedPosition)", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        cfi: "epubcfi(/6/2!/4/2/1:0)",
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([])
    })

    it("does not emit on restoration / pagination cycles whose requested position mirrors the resolved one", async () => {
      const { reader, navigator, spine } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 0, y: 0 }),
        animation: false,
      })
      await waitFor(50)

      spine.layout()
      await firstValueFrom(spine.layout$)
      await waitFor(50)

      unsubscribe()

      expect(events).toEqual([])
    })

    /**
     * Regression: pan navigation holds `reader.navigation.lock()`. While
     * the lock is held the user-driven entry is deferred via
     * `navigationUpdateFollowingUserUnlock$`; on unlock the navigator
     * runs a restoration cycle. Previously that cycle unconditionally
     * rewrote `requestedPosition` to the resolved `position`, so a pan
     * past start/end never reached `outOfSpineBoundary`. The fix
     * preserves the user's raw `requestedPosition` through the
     * unlock-driven restoration path so the boundary fires once the
     * snap-back animation settles.
     */
    it("emits 'end' once the snap-back settles after a pan past the right edge releases its lock", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      const releaseLock = navigator.lock()

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })

      // While the lock is held, the deferred entry never settles —
      // equivalent to the "still panning" phase.
      await waitFor(50)
      expect(events).toEqual([])

      releaseLock()

      // The unlock-driven restoration runs a snap animation back to the
      // clamped position; the boundary fires once it settles
      // (default `snapAnimationDuration` is 300ms).
      await waitFor(500)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    it("emits 'start' once the snap-back settles after a pan past the left edge releases its lock", async () => {
      const { reader, navigator } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      const releaseLock = navigator.lock()

      navigator.navigate({
        position: new SpinePosition({ x: -10, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      releaseLock()

      await waitFor(500)
      unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })

    /**
     * Once the user-unlock restoration has fired the boundary event,
     * subsequent self-driven cycles (layout reflow, pagination
     * consolidation) must not re-fire it for the same stale user
     * intent. This is exactly why the post-restoration map mirrors
     * `requestedPosition` to the resolved `position` on the layout
     * path: it consumes the raw request after the boundary detector
     * has had its single fire.
     */
    it("does not re-fire 'end' on a subsequent layout reflow after a locked pan past the right edge", async () => {
      const { reader, navigator, spine } = createTestReader()
      const { events, unsubscribe } = collectBoundaries(reader)

      const releaseLock = navigator.lock()
      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
        animation: false,
      })
      await waitFor(50)
      releaseLock()
      await waitFor(500)
      expect(events).toEqual([{ boundary: "end" }])

      spine.layout()
      await firstValueFrom(spine.layout$)
      await waitFor(500)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })
  })

  describe("Given a vertical book", () => {
    it("emits 'end' when the requested y is past layout.bottom", async () => {
      const { reader, navigator, settings } = createTestReader()
      settings.update({ pageTurnDirection: "vertical" })

      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: 0, y: 9999 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })
  })

  describe("Given an RTL horizontal book", () => {
    /**
     * Re-mock spine layout for RTL. RTL spreads negatively from `right=0`,
     * so item 0 (first in reading order) is the *rightmost* one
     * `[0, +itemSize)` and the *last* spine item is the leftmost
     * `[-(N-1)*itemSize, -(N-2)*itemSize)`. Mirrors the convention used by
     * `getSpineItemFromPosition` and the resolvers' RTL clamping.
     */
    const setupRTLLayout = (
      spine: ReturnType<typeof createTestReader>["spine"],
      items: ReturnType<typeof createTestReader>["items"],
      spineItemsManager: SpineItemsManager,
      itemSize: number,
    ) => {
      const layoutInfos = items.map(
        (_, index) =>
          new SpineItemSpineLayout({
            left: -index * itemSize,
            top: 0,
            right: itemSize - index * itemSize,
            bottom: itemSize,
            width: itemSize,
            height: itemSize,
            x: -index * itemSize,
            y: 0,
          }),
      )

      // `generateItems` already installed an LTR-layout spy on the same
      // method; reset before re-installing the RTL implementation so the
      // new mock fully replaces the old one (vi.spyOn returns the existing
      // spy when the prop is already spied — without the reset we'd end up
      // running with whichever mockImplementation happened to win).
      vi.mocked(spine.getSpineItemSpineLayoutInfo).mockReset()
      vi.spyOn(spine, "getSpineItemSpineLayoutInfo").mockImplementation(
        (item) => {
          const itemIndex = spineItemsManager.getSpineItemIndex(item) ?? 0
          // biome-ignore lint/style/noNonNullAssertion: index in range
          return layoutInfos[itemIndex]!
        },
      )

      return { lastItemLeft: -(items.length - 1) * itemSize }
    }

    it("emits 'end' when the requested x is strictly past layout.left", async () => {
      // 2 items × 100px in RTL → last item layout: [left=-100, right=0).
      const { reader, navigator, spine, items } = createTestReader({
        readingDirection: "rtl",
      })
      const { lastItemLeft } = setupRTLLayout(
        spine,
        items,
        reader.spineItemsManager,
        100,
      )

      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new UnboundSpinePosition({ x: lastItemLeft - 1, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "end" }])
    })

    it("does NOT emit when the requested x is exactly at layout.left (the first valid position of the last RTL spine item)", async () => {
      // Regression: half-open `[left, right)` semantics — `x === layout.left`
      // is in-bounds (it's the leftmost valid pixel of the last spine item),
      // not past end. A bug here surfaces as a phantom "end" event when the
      // navigator legitimately resolves a forward turn into the last RTL
      // spine item, because the resolver returns exactly that left edge.
      const { reader, navigator, spine, items } = createTestReader({
        readingDirection: "rtl",
      })
      const { lastItemLeft } = setupRTLLayout(
        spine,
        items,
        reader.spineItemsManager,
        100,
      )

      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: lastItemLeft, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([])
    })

    it("emits 'start' when the requested x is positive (past the right edge in RTL = before the start in reading order)", async () => {
      const { reader, navigator, spine, items } = createTestReader({
        readingDirection: "rtl",
      })
      setupRTLLayout(spine, items, reader.spineItemsManager, 100)

      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new UnboundSpinePosition({ x: 10, y: 0 }),
        animation: false,
      })

      await waitFor(50)
      unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })

    /**
     * Regression: a previous implementation pulled the user-driven
     * entry via `withLatestFrom(latestUserNavigation$)`. That works
     * only as long as the user-filter subscribes `navigation$` BEFORE
     * the settled side does — `withLatestFrom` itself subscribes its
     * secondary first, so in isolation the user-filter is subscriber 1
     * and stays fresh. But once any *other* consumer has already
     * subscribed to settled-navigation observation (pagination, UI,
     * gestures, etc., routine in real apps), its `combineLatest` is
     * already `navigation$`'s subscriber 1 and the user-filter ends up
     * subscriber 2 — settled-side fires first on every emission, so
     * `withLatestFrom` resolves to the *previous* user nav. Boundary
     * detection then lags by one navigation: forward → back → back-
     * past-start emits no event, only the *next* back finally fires
     * (evaluating the prior request). The fix uses `combineLatest`,
     * which keeps both inputs at their latest cached values regardless
     * of subscriber order, with a downstream `distinctUntilChanged` on
     * the user-nav id collapsing the multiple intermediate emissions
     * to a single check per user request.
     */
    it("emits 'start' on the FIRST back-past-start after a forward+back sequence even when settled navigation already has a prior subscriber", async () => {
      const { reader, navigator, spine, items } = createTestReader({
        readingDirection: "rtl",
      })
      setupRTLLayout(spine, items, reader.spineItemsManager, 100)

      const priorSubscription = observeSettledNavigation(
        reader.navigation,
      ).subscribe()

      const { events, unsubscribe } = collectBoundaries(reader)

      navigator.navigate({
        position: new SpinePosition({ x: -100, y: 0 }),
        animation: false,
      })
      await waitFor(50)

      navigator.navigate({
        position: new SpinePosition({ x: 0, y: 0 }),
        animation: false,
      })
      await waitFor(50)

      expect(events).toEqual([])

      navigator.navigate({
        position: new UnboundSpinePosition({ x: 100, y: 0 }),
        animation: false,
      })
      await waitFor(50)
      unsubscribe()
      priorSubscription.unsubscribe()

      expect(events).toEqual([{ boundary: "start" }])
    })
  })
})
