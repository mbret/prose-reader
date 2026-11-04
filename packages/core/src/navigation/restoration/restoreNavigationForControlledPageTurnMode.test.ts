import { firstValueFrom, lastValueFrom } from "rxjs"
import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../../cfi"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { Spine } from "../../spine/Spine"
import { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { SpineItemPosition } from "../../spineItem/types"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../tests/utils"
import { Viewport } from "../../viewport/Viewport"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { mockSpineItemsLayout } from "../tests/utils"
import type { InternalNavigationEntry, NavigationConsolidation } from "../types"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"

/**
 * Two items of two pages each, in a viewport 50 wide and 100 high: an item is
 * 100 by 100, laid out side by side.
 */
const createLaidOutTwoPageItems = async () => {
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
  const spineItemLocator = createSpineItemLocator({
    context,
    settings,
    viewport,
  })
  const spine = new Spine(
    context,
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

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(50)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  mockSpineItemsLayout(100, spine, spineItemsManager)

  spine.layout()

  await firstValueFrom(spine.layout$)

  const restore = (
    navigation: InternalNavigationEntry & NavigationConsolidation,
  ) =>
    lastValueFrom(
      restoreNavigationForControlledPageTurnMode({
        navigation,
        navigationResolver,
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        spineItemsManager: spineItemsManager as any,
        spineLocator: spine.locator,
        spine,
        cfiManager,
      }),
    )

  return { navigationResolver, restore }
}

describe(`Given a backward navigation to a new item`, () => {
  describe(`when item was unloaded`, () => {
    describe(`and item is bigger once loaded`, () => {
      it(`should restore position at the last page`, async () => {
        const { restore } = await createLaidOutTwoPageItems()

        const position = await restore({
          target: {
            type: "position",
            value: new SpinePosition({ x: 0, y: 0 }),
          },
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
        })

        expect(position).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
      })
    })
  })
})

/**
 * A layout can move an item's text from one page to another and keep the
 * item's size, as a smaller font that keeps a chapter's page count does.
 * Here the navigation is on the item's second page, and its cfi now resolves
 * to the first.
 */
describe(`Given a navigation on the second page of an item whose size did not change`, () => {
  const navigationOnSecondPage = (
    cfi: string,
  ): InternalNavigationEntry & NavigationConsolidation => ({
    target: { type: "cfi", value: cfi },
    position: new SpinePosition({ x: 50, y: 0 }),
    requestedPosition: new SpinePosition({ x: 50, y: 0 }),
    positionInSpineItem: new SpineItemPosition({ x: 50, y: 0 }),
    spineItem: 0,
    spineItemWidth: 100,
    spineItemHeight: 100,
    spineItemLeft: 0,
    spineItemTop: 0,
    spineItemIsReady: true,
    directionFromLastNavigation: "forward",
    anchor: { cfi, percentageEstimateOfBook: 0, state: "final" },
    meta: { triggeredBy: `user` },
    type: `api`,
    id: Symbol(),
  })

  it(`restores to the page its character is on now`, async () => {
    const { navigationResolver, restore } = await createLaidOutTwoPageItems()

    vi.spyOn(navigationResolver, "getNavigationForCfi").mockReturnValue(
      new SpinePosition({ x: 0, y: 0 }),
    )

    const position = await restore(
      navigationOnSecondPage("epubcfi(/6/2!/4/2/1:12)"),
    )

    expect(position).toMatchObject(new SpinePosition({ x: 0, y: 0 }))
  })

  it(`keeps its page when its cfi points at an element, which can start on the page before`, async () => {
    const { navigationResolver, restore } = await createLaidOutTwoPageItems()
    const getNavigationForCfi = vi
      .spyOn(navigationResolver, "getNavigationForCfi")
      .mockReturnValue(new SpinePosition({ x: 0, y: 0 }))

    const position = await restore(navigationOnSecondPage("epubcfi(/6/2!/4/2)"))

    expect(position).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
    expect(getNavigationForCfi).not.toHaveBeenCalled()
  })
})
