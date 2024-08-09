/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { SpineItemsManagerMock } from "../tests/SpineItemsManagerMock"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { Context } from "../../context/Context"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createSpineLocator } from "../../spine/locator/SpineLocator"
import { generateItems } from "../tests/utils"

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, () => {
        const context = new Context()
        const settings = new ReaderSettingsManager({}, context)
        const spineItemsManager = new SpineItemsManagerMock()
        const spineItemLocator = createSpineItemLocator({
          context,
          settings,
        })
        const spineLocator = createSpineLocator({
          context,
          settings,
          spineItemLocator,
          spineItemsManager: spineItemsManager as any,
        })
        const navigationResolver = createNavigationResolver({
          context,
          locator: spineLocator,
          settings,
          spineItemsManager: spineItemsManager as any,
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
        spineItemsManager.load(generateItems(100, 2))

        const position = restoreNavigationForControlledPageTurnMode({
          navigation: {
            position: {
              x: 0,
              y: 0,
            },
            spineItem: 0,
            spineItemWidth: 50,
            directionFromLastNavigation: "backward",
            spineItemHeight: 100,
            spineItemLeft: 0,
            spineItemTop: 0,
            meta: {
              triggeredBy: `user`,
            },
            type: `api`,
            id: Symbol(),
          },
          navigationResolver,
          spineItemsManager: spineItemsManager as any,
          spineLocator,
        })

        expect(position).toEqual({ x: 50, y: 0 })
      })
    })
  })
})
