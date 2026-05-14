import { firstValueFrom, skip } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../cfi"
import { Context } from "../context/Context"
import { HookManager } from "../hooks/HookManager"
import { Pagination } from "../pagination/Pagination"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { Spine } from "../spine/Spine"
import { SpineItemsManager } from "../spine/SpineItemsManager"
import { SpinePosition } from "../spine/types"
import { createSpineItemLocator } from "../spineItem/locationResolver"
import { waitFor } from "../tests/utils"
import { Viewport } from "../viewport/Viewport"
import { createNavigator } from "./Navigator"
import { generateItems } from "./tests/utils"
import type { InternalNavigationEntry } from "./types"

const createNavigatorContext = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const hookManager = new HookManager()
  const spineItemsManager = new SpineItemsManager(context, settings)
  const cfi = new CfiManager(hookManager, spineItemsManager)
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
    cfi,
    context,
    settings,
    spineItemsManager,
    hookManager,
    spine,
    viewport,
  })

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)

  viewport.layout()

  return {
    navigator,
    context,
    settings,
    spineItemsManager,
    hookManager,
    spine,
    viewport,
  }
}

describe(`Given unloaded book`, () => {
  describe("Given invalid navigation position", () => {
    it(`should return safe edge position`, async () => {
      const { navigator } = createNavigatorContext()
      const navigations: InternalNavigationEntry[] = []

      const sub = navigator.internalNavigator.navigationSubject
        .pipe(skip(1))
        .subscribe((navigation) => {
          navigations.push(navigation)
        })

      navigator.navigate({
        position: new SpinePosition({
          x: -10,
          y: -20,
        }),
      })

      await waitFor(100)

      sub.unsubscribe()

      expect(navigations.length).toBe(1)
      expect(navigations[0]).toMatchObject({
        position: { x: 0, y: 0 },
        meta: {
          triggeredBy: "user",
        },
        type: "api",
      })
    })
  })

  describe("Given invalid negative navigation spine item", () => {
    it(`should remove it`, async () => {
      const { navigator } = createNavigatorContext()
      const navigations: InternalNavigationEntry[] = []

      const sub = navigator.internalNavigator.navigationSubject
        .pipe(skip(1))
        .subscribe((navigation) => {
          navigations.push(navigation)
        })

      navigator.navigate({
        spineItem: -1,
      })

      await waitFor(100)

      sub.unsubscribe()

      expect(navigations.length).toBe(1)
      expect(navigations[0]).toMatchObject({
        position: { x: 0, y: 0 },
        meta: {
          triggeredBy: "user",
        },
        type: "api",
      })
    })
  })
})

describe(`Given loaded book`, () => {
  describe("Given invalid negative navigation spine item", () => {
    it(`should fallback to 0`, async () => {
      const {
        navigator,
        spineItemsManager,
        context,
        settings,
        hookManager,
        spine,
        viewport,
      } = createNavigatorContext()
      const navigations: InternalNavigationEntry[] = []

      const items = generateItems(
        100,
        2,
        context,
        settings,
        hookManager,
        spine,
        spineItemsManager,
        viewport,
      )

      spineItemsManager.addMany(items)

      const sub = navigator.internalNavigator.navigationSubject
        .pipe(skip(1))
        .subscribe((navigation) => {
          navigations.push(navigation)
        })

      navigator.navigate({
        spineItem: -1,
      })

      await waitFor(100)

      sub.unsubscribe()

      expect(navigations.length).toBe(1)
      expect(navigations[0]).toMatchObject({
        position: { x: 0, y: 0 },
        spineItem: 0,
        meta: {
          triggeredBy: "user",
        },
        type: "api",
      })
    })
  })

  describe("Given invalid positive navigation spine item", () => {
    it(`should fallback to length - 1`, async () => {
      const {
        spine,
        context,
        settings,
        hookManager,
        navigator,
        spineItemsManager,
        viewport,
      } = createNavigatorContext()
      const navigations: InternalNavigationEntry[] = []

      const items = generateItems(
        100,
        2,
        context,
        settings,
        hookManager,
        spine,
        spineItemsManager,
        viewport,
      )

      spineItemsManager.addMany(items)

      spine.layout()

      await firstValueFrom(spine.layout$)

      const sub = navigator.internalNavigator.navigationSubject
        .pipe(skip(1))
        .subscribe((navigation) => {
          navigations.push(navigation)
        })

      navigator.navigate({
        spineItem: 2,
      })

      await waitFor(100)

      sub.unsubscribe()

      expect(navigations.length).toBe(1)
      expect(navigations[0]).toMatchObject({
        position: { x: 100, y: 0 },
        spineItem: 1,
        meta: {
          triggeredBy: "user",
        },
        type: "api",
      })
    })
  })

  describe("Given navigate() with a position past the end of the book", () => {
    it.each([
      ["paginated", "controlled" as const],
      ["scrollable", "scrollable" as const],
    ])(`should clamp to viewport-flush position in %s mode and preserve the raw request`, async (_label, computedPageTurnMode) => {
      const {
        spine,
        context,
        settings,
        hookManager,
        navigator,
        spineItemsManager,
        viewport,
      } = createNavigatorContext()

      settings.update({ pageTurnMode: computedPageTurnMode })

      const navigations: InternalNavigationEntry[] = []

      const items = generateItems(
        100,
        2,
        context,
        settings,
        hookManager,
        spine,
        spineItemsManager,
        viewport,
      )

      spineItemsManager.addMany(items)

      spine.layout()

      await firstValueFrom(spine.layout$)

      const sub = navigator.internalNavigator.navigationSubject
        .pipe(skip(1))
        .subscribe((navigation) => {
          navigations.push(navigation)
        })

      navigator.navigate({
        position: new SpinePosition({ x: 9999, y: 0 }),
      })

      await waitFor(100)

      sub.unsubscribe()

      expect(navigations.length).toBe(1)
      expect(navigations[0]).toMatchObject({
        position: { x: 100, y: 0 },
        requestedPosition: { x: 9999, y: 0 },
        meta: { triggeredBy: "user" },
        type: "api",
      })
    })
  })

  describe("Given two consecutive user navigations resolving to the same position in scrollable mode", () => {
    // Regression: with the thumbnail/zoom toggle in scrollable mode, the
    // second call resolved to the same spine position as the first but
    // needed a different DOM scroll because the scale factor changed in
    // between. A `position`-equality short-circuit before the active mode
    // controller dropped the second call and the user landed on the wrong page.
    it("should forward both to scrollNavigationController.navigate", async () => {
      const {
        spine,
        context,
        settings,
        hookManager,
        navigator,
        spineItemsManager,
        viewport,
      } = createNavigatorContext()

      settings.update({ pageTurnMode: "scrollable" })

      const items = generateItems(
        100,
        2,
        context,
        settings,
        hookManager,
        spine,
        spineItemsManager,
        viewport,
      )

      spineItemsManager.addMany(items)

      spine.layout()

      await firstValueFrom(spine.layout$)

      const scrollControllerNavigateSpy = vi.spyOn(
        navigator.scrollNavigationController,
        "navigate",
      )

      navigator.navigate({ position: new SpinePosition({ x: 0, y: 50 }) })

      await waitFor(50)

      navigator.navigate({ position: new SpinePosition({ x: 0, y: 50 }) })

      await waitFor(50)

      expect(scrollControllerNavigateSpy).toHaveBeenCalledTimes(2)
    })
  })
})
