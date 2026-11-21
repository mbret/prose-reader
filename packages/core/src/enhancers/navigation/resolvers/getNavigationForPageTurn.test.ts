import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../../../cfi/index.ts"
import { Context } from "../../../context/Context.ts"
import { HookManager } from "../../../hooks/HookManager.ts"
import { createNavigationResolver } from "../../../navigation/resolvers/NavigationResolver.ts"
import { mockSpineLayout } from "../../../navigation/tests/utils.ts"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager.ts"
import { Spine } from "../../../spine/Spine.ts"
import { SpineItemsManager } from "../../../spine/SpineItemsManager.ts"
import {
  SpineItemSpineLayout,
  UnboundSpinePosition,
} from "../../../spine/types.ts"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../../tests/utils.ts"
import { Viewport } from "../../../viewport/Viewport.ts"
import {
  getNavigationForPageTurn,
  type PageTurnSide,
} from "./getNavigationForPageTurn.ts"

/**
 * One spine item at the origin of the spine. Its size and how its text is
 * written are set, since no document loads.
 */
const createContext = ({
  pageTurnMode = "scrollable",
  spreadMode = "never",
  readingDirection = "ltr",
  viewportWidth = 100,
  itemSize = { width: 200, height: 250 },
  isUsingVerticalWriting = false,
}: {
  pageTurnMode?: "scrollable" | "controlled"
  spreadMode?: "never" | "always"
  readingDirection?: "ltr" | "rtl"
  viewportWidth?: number
  itemSize?: { width: number; height: number }
  isUsingVerticalWriting?: boolean
} = {}) => {
  const context = new Context(
    createTestManifest({
      readingDirection,
      spineItems: createTestManifestSpineItems([
        { href: "item.xhtml", id: "item" },
      ]),
    }),
  )
  const settings = new ReaderSettingsManager(
    {
      pageTurnMode,
      spreadMode,
      pageTurnAnimation: "none",
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
  const spine = new Spine(context, spineItemsManager, settings, viewport)
  const spineItem = spineItemsManager.items[0]

  if (!spineItem) throw new Error("Expected one spine item from the manifest")

  const spineItemLayout = new SpineItemSpineLayout({
    bottom: itemSize.height,
    height: itemSize.height,
    left: 0,
    right: itemSize.width,
    top: 0,
    width: itemSize.width,
    x: 0,
    y: 0,
  })

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(
    viewportWidth,
  )
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)
  vi.spyOn(spineItem, "layoutInfo", "get").mockReturnValue(itemSize)
  vi.spyOn(spineItem, "isUsingVerticalWriting").mockReturnValue(
    isUsingVerticalWriting,
  )
  mockSpineLayout(spine, spineItemsManager, [spineItemLayout])

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

describe("getNavigationForPageTurn to the right or bottom", () => {
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

    const target = getNavigationForPageTurn({
      side: "rightOrBottom",
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

describe("getNavigationForPageTurn to the left or top", () => {
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

    const target = getNavigationForPageTurn({
      side: "leftOrTop",
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

/**
 * Pages of 100 by 100. The single turn steps one page inside the item, or
 * past its edge when it has no page on that side.
 */
const turn = (
  side: PageTurnSide,
  from: { x: number; y: number },
  options: Parameters<typeof createContext>[0],
) => {
  const {
    context,
    navigationResolver,
    settings,
    spine,
    spineItem,
    spineItemsManager,
    viewport,
  } = createContext({ pageTurnMode: "controlled", ...options })

  const { x, y } = getNavigationForPageTurn({
    side,
    context,
    navigationResolver,
    position: new UnboundSpinePosition(from),
    settings,
    spineItem,
    spineItemsManager,
    spineLocator: spine.locator,
    viewport,
  })

  return { x, y }
}

describe("Given a controlled page turn across an item two pages wide", () => {
  const options = { itemSize: { width: 200, height: 100 } }

  it("turns to the next page on the right, then past the item's edge", () => {
    expect(turn("rightOrBottom", { x: 0, y: 0 }, options)).toEqual({
      x: 100,
      y: 0,
    })
    expect(turn("rightOrBottom", { x: 100, y: 0 }, options)).toEqual({
      x: 200,
      y: 0,
    })
  })

  it("turns to the page on the left, then past the item's edge", () => {
    expect(turn("leftOrTop", { x: 100, y: 0 }, options)).toEqual({
      x: 0,
      y: 0,
    })
    expect(turn("leftOrTop", { x: 0, y: 0 }, options)).toEqual({
      x: -100,
      y: 0,
    })
  })
})

describe("Given vertical writing in an item two pages high", () => {
  const options = {
    itemSize: { width: 100, height: 200 },
    isUsingVerticalWriting: true,
  }

  it("turns right to the page above, and left to the page below", () => {
    expect(turn("rightOrBottom", { x: 0, y: 100 }, options)).toEqual({
      x: 0,
      y: 0,
    })
    expect(turn("leftOrTop", { x: 0, y: 0 }, options)).toEqual({
      x: 0,
      y: 100,
    })
  })
})

describe("Given a spread of two pages", () => {
  it("turns two pages at once", () => {
    const options = {
      spreadMode: "always" as const,
      viewportWidth: 200,
      itemSize: { width: 400, height: 100 },
    }

    expect(turn("rightOrBottom", { x: 0, y: 0 }, options)).toEqual({
      x: 200,
      y: 0,
    })
    expect(turn("leftOrTop", { x: 200, y: 0 }, options)).toEqual({
      x: 0,
      y: 0,
    })
  })

  const verticalWritingItemOfOnePage = {
    spreadMode: "always" as const,
    viewportWidth: 200,
    itemSize: { width: 100, height: 100 },
    isUsingVerticalWriting: true,
  }

  it("leaves a vertical-writing item by a whole spread to the right", () => {
    expect(
      turn("rightOrBottom", { x: 0, y: 0 }, verticalWritingItemOfOnePage),
    ).toEqual({ x: 200, y: 0 })
  })

  it.fails("leaves a vertical-writing item to the right in a right-to-left book (#794)", () => {
    const { x } = turn(
      "rightOrBottom",
      { x: 0, y: 0 },
      { ...verticalWritingItemOfOnePage, readingDirection: "rtl" },
    )

    expect(x).toBeGreaterThan(0)
  })
})
