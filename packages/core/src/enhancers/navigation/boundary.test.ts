import { firstValueFrom } from "rxjs"
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

  // Cast to Reader is safe here: only the fields read by `outOfSpineBoundary`
  // and friends are wired up (navigation, spineItemsManager, spine, context).
  const reader = {
    navigation: navigator,
    spineItemsManager,
    spine,
    context,
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

    it("emits 'end' when the requested x is exactly at layout.right", async () => {
      // 2 items × 100px = layout.right = 200; an x === 200 request is the
      // "first pixel past content" case, which the half-open extent treats
      // as past end.
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
      // First nav: in-bounds, settles. Then trigger a fresh layout, which
      // produces a restoration entry where `requestedPosition` is mirrored
      // to the resolved position by construction (see `InternalNavigator`'s
      // restoration branch). Boundary must not fire for that.
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
})
