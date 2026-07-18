import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../../../cfi"
import { Context } from "../../../context/Context"
import { HookManager } from "../../../hooks/HookManager"
import { createNavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import { Pagination } from "../../../pagination/Pagination"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { Spine } from "../../../spine/Spine"
import { SpineItemsManager } from "../../../spine/SpineItemsManager"
import {
  SpineItemSpineLayout,
  UnboundSpinePosition,
} from "../../../spine/types"
import { createSpineItemLocator } from "../../../spineItem/locationResolver"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../../tests/utils"
import { Viewport } from "../../../viewport/Viewport"
import { getNavigationForLeftOrTopPage } from "./getNavigationForLeftOrTopPage"
import { getNavigationForRightOrBottomPage } from "./getNavigationForRightOrBottomPage"

const createContext = () => {
  const context = new Context(
    createTestManifest({
      spineItems: createTestManifestSpineItems([
        { href: "item.xhtml", id: "item" },
      ]),
    }),
  )
  const settings = new ReaderSettingsManager(
    {
      pageTurnMode: "scrollable",
    },
    context,
  )
  const hookManager = new HookManager()
  const viewport = new Viewport(context, settings)
  const spineItemsManager = new SpineItemsManager(
    context,
    settings,
    hookManager,
    viewport,
  )
  const cfi = new CfiManager(hookManager, spineItemsManager)
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
    viewport,
  )
  const spineItem = spineItemsManager.items[0]

  if (!spineItem) throw new Error("Expected one spine item from the manifest")

  const spineItemLayout = new SpineItemSpineLayout({
    bottom: 250,
    height: 250,
    left: 0,
    right: 200,
    top: 0,
    width: 200,
    x: 0,
    y: 0,
  })

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  vi.spyOn(spineItem, "layoutInfo", "get").mockReturnValue({
    height: 250,
    width: 200,
  })
  vi.spyOn(spine, "getSpineItemSpineLayoutInfo").mockReturnValue(
    spineItemLayout,
  )

  viewport.layout()

  const navigationResolver = createNavigationResolver({
    cfi,
    context,
    locator: spine.locator,
    settings,
    spine,
    spineItemsManager,
    viewport,
  })

  return {
    context,
    navigationResolver,
    settings,
    spine,
    spineItem,
    spineItemsManager,
    viewport,
  }
}

describe("getNavigationForRightOrBottomPage", () => {
  it("keeps vertical scrollable turns continuous so the bottom clamps in place", () => {
    const {
      context,
      navigationResolver,
      settings,
      spine,
      spineItem,
      spineItemsManager,
      viewport,
    } = createContext()
    const currentBottomPosition = new UnboundSpinePosition({ x: 0, y: 150 })

    const target = getNavigationForRightOrBottomPage({
      computedPageTurnDirection: settings.values.computedPageTurnDirection,
      context,
      navigationResolver,
      position: currentBottomPosition,
      settings,
      spineItem,
      spineItemsManager,
      spineLocator: spine.locator,
      viewport,
    })

    expect(target).toMatchObject({ x: 0, y: 250 })
    expect(
      navigationResolver.clampPositionInSpine(
        target,
        viewport.relativeViewport,
      ),
    ).toMatchObject(currentBottomPosition)
  })
})

describe("getNavigationForLeftOrTopPage", () => {
  it("keeps vertical scrollable turns continuous so the top clamps in place", () => {
    const {
      context,
      navigationResolver,
      settings,
      spine,
      spineItem,
      spineItemsManager,
      viewport,
    } = createContext()
    const currentTopPosition = new UnboundSpinePosition({ x: 12, y: 0 })

    const target = getNavigationForLeftOrTopPage({
      computedPageTurnDirection: settings.values.computedPageTurnDirection,
      context,
      navigationResolver,
      position: currentTopPosition,
      settings,
      spineItem,
      spineItemsManager,
      spineLocator: spine.locator,
      viewport,
    })

    expect(target).toMatchObject({ x: 12, y: -100 })
    expect(
      navigationResolver.clampPositionInSpine(
        target,
        viewport.relativeViewport,
      ),
    ).toMatchObject(currentTopPosition)
  })
})
