import { firstValueFrom, lastValueFrom, of } from "rxjs"
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
import type {
  InternalNavigationAnchor,
  InternalNavigationEntry,
  NavigationConsolidation,
} from "../types"
import { restoreNavigationForControlledPageTurnMode } from "./restoreNavigationForControlledPageTurnMode"

/**
 * Two items of two pages each, in a viewport 50 wide and 100 high: an item is
 * 100 by 100, laid out side by side. No document loads, so the first item's
 * readiness is set.
 */
const createLaidOutTwoPageItems = async ({
  isFirstItemReady = false,
}: {
  isFirstItemReady?: boolean
} = {}) => {
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
    spineItemsManager,
    spineItemLocator,
    settings,
    viewport,
  )
  const navigationResolver = createNavigationResolver({
    cfi: cfiManager,
    context,
    locator: spine.locator,
    settings,
    spineItemsManager,
    spine,
    viewport,
  })

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(50)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  viewport.layout()

  mockSpineItemsLayout(100, spine, spineItemsManager)

  spine.layout()

  await firstValueFrom(spine.layout$)

  const firstItem = spineItemsManager.get(0)

  if (!firstItem) throw new Error("the manifest has no first item")

  vi.spyOn(firstItem, "isReady$", "get").mockReturnValue(of(isFirstItemReady))

  const restore = (
    navigation: InternalNavigationEntry & NavigationConsolidation,
  ) =>
    lastValueFrom(
      restoreNavigationForControlledPageTurnMode({
        navigation,
        navigationResolver,
        spineItemsManager,
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
 * The item's text moved without changing its size, as after a smaller font
 * that keeps the item's page count: the anchor was on the second page when the
 * navigation was made, and is on the first now.
 */
describe(`Given a navigation on the second page of an item whose size did not change`, () => {
  const restoreWithAnchorNowOnFirstPage = async (
    anchor: Pick<InternalNavigationAnchor, "cfi" | "isPageElement">,
    { isItemReady = true }: { isItemReady?: boolean } = {},
  ) => {
    const { navigationResolver, restore } = await createLaidOutTwoPageItems({
      isFirstItemReady: isItemReady,
    })

    vi.spyOn(navigationResolver, "getNavigationForCfi").mockReturnValue(
      new SpinePosition({ x: 0, y: 0 }),
    )

    return restore({
      target: { type: "cfi", value: anchor.cfi },
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
      anchor: { ...anchor, percentageEstimateOfBook: 0, state: "final" },
      meta: { triggeredBy: `user` },
      type: `api`,
      id: Symbol(),
    })
  }

  it.each([
    { anchor: "a character", cfi: "epubcfi(/6/2!/4/2/1:12)" },
    { anchor: "the element a target names", cfi: "epubcfi(/6/2!/4/2:0)" },
  ])(`restores to the page holding $anchor now`, async ({ cfi }) => {
    expect(
      await restoreWithAnchorNowOnFirstPage({ cfi, isPageElement: false }),
    ).toMatchObject(new SpinePosition({ x: 0, y: 0 }))
  })

  it(`keeps its page when its anchor is an element of the page, which can start on the page before`, async () => {
    expect(
      await restoreWithAnchorNowOnFirstPage({
        cfi: "epubcfi(/6/2!/4/2:0)",
        isPageElement: true,
      }),
    ).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
  })

  it(`keeps its page while the item's document is not ready, which holds no anchor to find`, async () => {
    expect(
      await restoreWithAnchorNowOnFirstPage(
        { cfi: "epubcfi(/6/2!/4/2/1:12)", isPageElement: false },
        { isItemReady: false },
      ),
    ).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
  })
})
