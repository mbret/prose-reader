import { firstValueFrom, of } from "rxjs"
import { describe, expect, it } from "vitest"
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
import type { InternalNavigationEntry } from "./InternalNavigator"
import { createNavigator } from "./Navigator"
import { generateItems } from "./tests/utils"

const createNavigatorContext = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const spineItemsManager = new SpineItemsManager(context, settings)
  const hookManager = new HookManager()
  const viewport = new Viewport(context)
  const pagination = new Pagination(context, spineItemsManager)
  const spineItemLocator = createSpineItemLocator({ context, settings })
  const spine = new Spine(
    of(document.createElement("div")),
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

      const sub = navigator.internalNavigator.navigated$.subscribe(
        (navigation) => {
          navigations.push(navigation)
        },
      )

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

      const sub = navigator.internalNavigator.navigated$.subscribe(
        (navigation) => {
          navigations.push(navigation)
        },
      )

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
      )

      spineItemsManager.addMany(items)

      const sub = navigator.internalNavigator.navigated$.subscribe(
        (navigation) => {
          navigations.push(navigation)
        },
      )

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
      )

      spineItemsManager.addMany(items)

      spine.layout()

      await firstValueFrom(spine.spineLayout.layout$)

      const sub = navigator.internalNavigator.navigated$.subscribe(
        (navigation) => {
          navigations.push(navigation)
        },
      )

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
})
