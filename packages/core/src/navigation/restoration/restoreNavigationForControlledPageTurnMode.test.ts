import { firstValueFrom, lastValueFrom, of } from "rxjs"
import { describe, expect, it } from "vitest"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { Pagination } from "../../pagination/Pagination"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { noopElement } from "../../utils/dom"
import { Viewport } from "../../viewport/Viewport"
import type {
  InternalNavigationEntry,
  NavigationConsolidation,
} from "../InternalNavigator"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { generateItems } from "../tests/utils"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, async () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManager(context, settings)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const pagination = new Pagination(context, spineItemsManager as any)
        const hooksManager = new HookManager()
        const spineItemLocator = createSpineItemLocator({ context, settings })
        const viewport = new Viewport(context)
        const spine = new Spine(
          of(noopElement()),
          context,
          pagination,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          spineItemsManager as any,
          spineItemLocator,
          settings,
          hooksManager,
          viewport,
        )
        const navigationResolver = createNavigationResolver({
          context,
          locator: spine.locator,
          settings,
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          spineItemsManager: spineItemsManager as any,
          spineLayout: spine.spineLayout,
        })

        // page of 50w
        context.update({
          visibleAreaRect: {
            height: 100,
            width: 50,
            x: 0,
            y: 0,
          },
        })

        // items of 2 pages
        spineItemsManager.addMany(
          generateItems(
            100,
            2,
            context,
            settings,
            hooksManager,
            spine,
            spineItemsManager,
          ),
        )

        spine.layout()

        await firstValueFrom(spine.spineLayout.layout$)

        const position = await lastValueFrom(
          restoreNavigationForControlledPageTurnMode({
            navigation: {
              position: new SpinePosition({
                x: 0,
                y: 0,
              }),
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
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
            spineItemsManager: spineItemsManager as any,
            spineLocator: spine.locator,
            spineLayout: spine.spineLayout,
          }),
        )

        expect(position).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
      })
    })
  })
})
