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
 * 100 by 100, laid out side by side. No document loads, so what the first
 * item's document would tell is set: its readiness and how its text is
 * written.
 */
const createLaidOutTwoPageItems = async ({
  isFirstItemReady = false,
  firstItemReadingDirection = "ltr",
  isFirstItemUsingVerticalWriting = false,
}: {
  isFirstItemReady?: boolean
  firstItemReadingDirection?: "ltr" | "rtl"
  isFirstItemUsingVerticalWriting?: boolean
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
  vi.spyOn(firstItem, "readingDirection", "get").mockReturnValue(
    firstItemReadingDirection,
  )
  vi.spyOn(firstItem, "isUsingVerticalWriting").mockReturnValue(
    isFirstItemUsingVerticalWriting,
  )

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
    {
      isItemReady = true,
      readingDirection,
      isUsingVerticalWriting,
      spineItemWidthAtNavigation = 100,
    }: {
      isItemReady?: boolean
      readingDirection?: "ltr" | "rtl"
      isUsingVerticalWriting?: boolean
      spineItemWidthAtNavigation?: number
    } = {},
  ) => {
    const { navigationResolver, restore } = await createLaidOutTwoPageItems({
      isFirstItemReady: isItemReady,
      firstItemReadingDirection: readingDirection,
      isFirstItemUsingVerticalWriting: isUsingVerticalWriting,
    })

    const getNavigationForCfi = vi
      .spyOn(navigationResolver, "getNavigationForCfi")
      .mockReturnValue(new SpinePosition({ x: 0, y: 0 }))

    const position = await restore({
      target: { type: "cfi", value: anchor.cfi },
      position: new SpinePosition({ x: 50, y: 0 }),
      requestedPosition: new SpinePosition({ x: 50, y: 0 }),
      positionInSpineItem: new SpineItemPosition({ x: 50, y: 0 }),
      spineItem: 0,
      spineItemWidth: spineItemWidthAtNavigation,
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

    return {
      position,
      isAnchorResolved: getNavigationForCfi.mock.calls.length > 0,
    }
  }

  it.each([
    { anchor: "a character", cfi: "epubcfi(/6/2!/4/2/1:12)" },
    { anchor: "the element a target names", cfi: "epubcfi(/6/2!/4/2:0)" },
  ])(`restores to the page holding $anchor now`, async ({ cfi }) => {
    expect(
      (await restoreWithAnchorNowOnFirstPage({ cfi, isPageElement: false }))
        .position,
    ).toMatchObject(new SpinePosition({ x: 0, y: 0 }))
  })

  it(`keeps its page when its anchor is an element of the page, which can start on the page before`, async () => {
    expect(
      (
        await restoreWithAnchorNowOnFirstPage({
          cfi: "epubcfi(/6/2!/4/2:0)",
          isPageElement: true,
        })
      ).position,
    ).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
  })

  it(`restores an anchor that is an element of the page once the item resized`, async () => {
    expect(
      (
        await restoreWithAnchorNowOnFirstPage(
          { cfi: "epubcfi(/6/2!/4/2:0)", isPageElement: true },
          { spineItemWidthAtNavigation: 150 },
        )
      ).position,
    ).toMatchObject(new SpinePosition({ x: 0, y: 0 }))
  })

  /**
   * The reader cannot tell which page of such an item a node is on: in
   * vertical writing it knows only the first, and right to left it finds the
   * last page the node's text reaches. The items here are laid out side by
   * side, as a vertical item is not, so the test checks that the anchor is
   * not resolved rather than where the reader lands.
   */
  it.each([
    { writing: "right to left", options: { readingDirection: "rtl" as const } },
    { writing: "vertically", options: { isUsingVerticalWriting: true } },
  ])(
    `does not resolve its anchor in an item written $writing`,
    async ({ options }) => {
      const { isAnchorResolved } = await restoreWithAnchorNowOnFirstPage(
        { cfi: "epubcfi(/6/2!/4/2/1:12)", isPageElement: false },
        options,
      )

      expect(isAnchorResolved).toBe(false)
    },
  )

  it(`keeps its page while the item's document is not ready, which holds no anchor to find`, async () => {
    expect(
      (
        await restoreWithAnchorNowOnFirstPage(
          { cfi: "epubcfi(/6/2!/4/2/1:12)", isPageElement: false },
          { isItemReady: false },
        )
      ).position,
    ).toMatchObject(new SpinePosition({ x: 50, y: 0 }))
  })
})
