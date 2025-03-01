import { firstValueFrom } from "rxjs"
import { describe, expect, it } from "vitest"
import { waitFor } from "../tests/utils"
import type { InternalNavigationEntry } from "./InternalNavigator"
import { createNavigator, generateItems } from "./tests/utils"

describe(`Given unloaded book`, () => {
  describe("Given invalid navigation position", () => {
    it(`should return safe edge position`, async () => {
      const { internalNavigator, userNavigator } = createNavigator()
      const navigations: InternalNavigationEntry[] = []

      const sub = internalNavigator.navigated$.subscribe((navigation) => {
        navigations.push(navigation)
      })

      userNavigator.navigate({
        position: {
          x: -10,
          y: -20,
        },
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
      const { internalNavigator, userNavigator } = createNavigator()
      const navigations: InternalNavigationEntry[] = []

      const sub = internalNavigator.navigated$.subscribe((navigation) => {
        navigations.push(navigation)
      })

      userNavigator.navigate({
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
        internalNavigator,
        userNavigator,
        spineItemsManagerMock,
        context,
        settings,
        spine,
        hookManager,
      } = createNavigator()
      const navigations: InternalNavigationEntry[] = []

      spineItemsManagerMock.addMany(
        generateItems(
          100,
          2,
          context,
          settings,
          hookManager,
          spine,
          spineItemsManagerMock,
        ),
      )

      const sub = internalNavigator.navigated$.subscribe((navigation) => {
        navigations.push(navigation)
      })

      userNavigator.navigate({
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
        internalNavigator,
        userNavigator,
        spineItemsManagerMock,
        spine,
        context,
        settings,
        hookManager,
      } = createNavigator()
      const navigations: InternalNavigationEntry[] = []

      spineItemsManagerMock.addMany(
        generateItems(
          100,
          2,
          context,
          settings,
          hookManager,
          spine,
          spineItemsManagerMock,
        ),
      )

      spine.layout()

      await firstValueFrom(spine.spineLayout.layout$)

      const sub = internalNavigator.navigated$.subscribe((navigation) => {
        navigations.push(navigation)
      })

      userNavigator.navigate({
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
