import { firstValueFrom, lastValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../../cfi"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { Pagination } from "../../pagination/Pagination"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { mockSpineItemsLayout } from "../tests/utils"
import type { InternalNavigationEntry, NavigationConsolidation } from "../types"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, async () => {
        const context = new Context(
          createTestManifest({
            spineItems: createTestManifestSpineItems(2),
          }),
        )
        const settings = new ReaderSettingsManager({}, context)
        const hooksManager = new HookManager()
        const viewport = new Viewport(context, settings)
        const spineItemsManager = new SpineItemsManager(
          context,
          settings,
          hooksManager,
          viewport,
        )
        const cfiManager = new CfiManager(hooksManager, spineItemsManager)
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        const pagination = new Pagination(context, spineItemsManager as any)
        const spineItemLocator = createSpineItemLocator({
          context,
          settings,
          viewport,
        })
        const spine = new Spine(
          context,
          pagination,
          // biome-ignore lint/suspicious/noExplicitAny: TODO
          spineItemsManager as any,
          spineItemLocator,
          settings,
          viewport,
        )
        const navigationResolver = createNavigationResolver({
          cfi: cfiManager,
          context,
          locator: spine.locator,
          settings,
          // biome-ignore lint/suspicious/noExplicitAny: TODO
          spineItemsManager: spineItemsManager as any,
          spine,
          viewport,
        })

        vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
          50,
        )
        vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(
          100,
        )
        viewport.layout()

        // items of 2 pages
        mockSpineItemsLayout(100, spine, spineItemsManager)

        spine.layout()

        await firstValueFrom(spine.layout$)

        const position = await lastValueFrom(
          restoreNavigationForControlledPageTurnMode({
            navigation: {
              position: new SpinePosition({
                x: 0,
                y: 0,
              }),
              requestedPosition: new SpinePosition({ x: 0, y: 0 }),
              spineItem: 0,
              spineItemWidth: 50,
              directionFromLastNavigation: "backward",
              spineItemHeight: 100,
              spineItemLeft: 0,
              spineItemTop: 0,
              spineItemIsReady: true,
              meta: {
                triggeredBy: `user`,
              },
              type: `api`,
              id: Symbol(),
            } satisfies InternalNavigationEntry & NavigationConsolidation,
            navigationResolver,
            // biome-ignore lint/suspicious/noExplicitAny: TODO
            spineItemsManager: spineItemsManager as any,
            spineLocator: spine.locator,
            spine,
            cfiManager,
          }),
        )

        expect(position).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
      })
    })
  })
})
