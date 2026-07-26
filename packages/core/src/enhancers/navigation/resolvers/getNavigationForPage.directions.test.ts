import { describe, expect, it, vi } from "vitest"
import { CfiManager } from "../../../cfi"
import { Context } from "../../../context/Context"
import { HookManager } from "../../../hooks/HookManager"
import { createNavigationResolver } from "../../../navigation/resolvers/NavigationResolver"
import { Pagination } from "../../../pagination/Pagination"
import { ReaderSettingsManager } from "../../../settings/ReaderSettingsManager"
import { Spine } from "../../../spine/Spine"
import { SpineItemsManager } from "../../../spine/SpineItemsManager"
import { SpineItemSpineLayout, SpinePosition } from "../../../spine/types"
import { createSpineItemLocator } from "../../../spineItem/locationResolver"
import {
  createTestManifest,
  createTestManifestSpineItems,
} from "../../../tests/utils"
import { Viewport } from "../../../viewport/Viewport"
import { getNavigationForPage } from "./getNavigationForPage"
import type { PageNavigationDirection } from "./pageNavigationDirection"

/**
 * `getNavigationForPage` resolves both turn directions from a single
 * implementation by flipping the sign of its page-size deltas. These cases pin
 * that sign for every branch it can take, so an inverted delta (which would
 * silently turn pages the wrong way) fails here instead of in the reader.
 *
 * Viewport is 100x100 over three 200x250 spine items laid out left to right.
 */
const createHarness = ({
  readingDirection,
  pageTurnMode,
  pageTurnDirection,
  spreadMode,
  verticalWriting,
}: {
  readingDirection: "ltr" | "rtl"
  pageTurnMode: "controlled" | "scrollable"
  pageTurnDirection: "horizontal" | "vertical"
  spreadMode: boolean
  verticalWriting: boolean
}) => {
  const context = new Context(
    createTestManifest({
      readingDirection,
      spineItems: createTestManifestSpineItems([
        { href: "a.xhtml", id: "a" },
        { href: "b.xhtml", id: "b" },
        { href: "c.xhtml", id: "c" },
      ]),
    }),
  )
  const settings = new ReaderSettingsManager(
    { pageTurnMode, pageTurnDirection, spreadMode },
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

  vi.spyOn(viewport.value.element, "clientWidth", "get").mockReturnValue(100)
  vi.spyOn(viewport.value.element, "clientHeight", "get").mockReturnValue(100)

  for (const item of spineItemsManager.items) {
    vi.spyOn(item, "layoutInfo", "get").mockReturnValue({
      height: 250,
      width: 200,
    })
    vi.spyOn(item, "isUsingVerticalWriting").mockReturnValue(verticalWriting)
  }

  vi.spyOn(spine, "getSpineItemSpineLayoutInfo").mockImplementation((item) => {
    // the layout info is keyed by index, so resolve id/item references first
    const index =
      typeof item === "number"
        ? item
        : (spineItemsManager.get(item)?.index ?? 0)

    return new SpineItemSpineLayout({
      bottom: 250,
      height: 250,
      left: index * 200,
      right: index * 200 + 200,
      top: 0,
      width: 200,
      x: index * 200,
      y: 0,
    })
  })

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

  const spineItem = spineItemsManager.items[0]

  if (!spineItem) throw new Error("Expected a spine item from the manifest")

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

type Scenario = Parameters<typeof createHarness>[0]

const resolve = (
  scenario: Scenario,
  from: SpinePosition,
  direction: PageNavigationDirection,
) => {
  const harness = createHarness(scenario)

  return getNavigationForPage({
    position: from,
    spineItem: harness.spineItem,
    context: harness.context,
    navigationResolver: harness.navigationResolver,
    spineItemsManager: harness.spineItemsManager,
    spineLocator: harness.spine.locator,
    computedPageTurnDirection:
      harness.settings.values.computedPageTurnDirection,
    viewport: harness.viewport,
    settings: harness.settings,
    direction,
  })
}

const HORIZONTAL_LTR: Scenario = {
  readingDirection: "ltr",
  pageTurnMode: "controlled",
  pageTurnDirection: "horizontal",
  spreadMode: false,
  verticalWriting: false,
}

const VERTICAL_WRITING_SPREAD_LTR: Scenario = {
  readingDirection: "ltr",
  pageTurnMode: "controlled",
  pageTurnDirection: "horizontal",
  spreadMode: true,
  verticalWriting: true,
}

const VERTICAL_WRITING_SPREAD_RTL: Scenario = {
  ...VERTICAL_WRITING_SPREAD_LTR,
  readingDirection: "rtl",
}

const VERTICAL_TURN_SPREAD: Scenario = {
  readingDirection: "ltr",
  pageTurnMode: "controlled",
  pageTurnDirection: "vertical",
  spreadMode: true,
  verticalWriting: false,
}

const SCROLLABLE_VERTICAL: Scenario = {
  readingDirection: "ltr",
  pageTurnMode: "scrollable",
  pageTurnDirection: "vertical",
  spreadMode: false,
  verticalWriting: false,
}

const CASES: Array<{
  name: string
  scenario: Scenario
  from: { x: number; y: number }
  leftOrTop: { x: number; y: number }
  rightOrBottom: { x: number; y: number }
}> = [
  {
    name: "horizontal controlled: steps one page width per turn",
    scenario: HORIZONTAL_LTR,
    from: { x: 100, y: 0 },
    leftOrTop: { x: 0, y: 0 },
    rightOrBottom: { x: 200, y: 0 },
  },
  {
    name: "horizontal controlled: leaves the spine backwards at the very start",
    scenario: HORIZONTAL_LTR,
    from: { x: 0, y: 0 },
    leftOrTop: { x: -100, y: 0 },
    rightOrBottom: { x: 100, y: 0 },
  },
  {
    name: "vertical writing in spread (ltr): top moves down, bottom jumps out right",
    scenario: VERTICAL_WRITING_SPREAD_LTR,
    from: { x: 0, y: 0 },
    leftOrTop: { x: 0, y: 100 },
    rightOrBottom: { x: 100, y: 0 },
  },
  {
    // Same input as the ltr case above: only the extra spread page width flips,
    // which is the sole place readingDirection changes the outcome.
    name: "vertical writing in spread (rtl): the extra spread width flips sign",
    scenario: VERTICAL_WRITING_SPREAD_RTL,
    from: { x: 0, y: 0 },
    leftOrTop: { x: 0, y: 100 },
    rightOrBottom: { x: 0, y: 0 },
  },
  {
    name: "vertical writing in spread (ltr): mid item",
    scenario: VERTICAL_WRITING_SPREAD_LTR,
    from: { x: 100, y: 0 },
    leftOrTop: { x: 100, y: 100 },
    rightOrBottom: { x: 200, y: 0 },
  },
  {
    name: "vertical writing in spread (rtl): mid item",
    scenario: VERTICAL_WRITING_SPREAD_RTL,
    from: { x: 100, y: 0 },
    leftOrTop: { x: 100, y: 100 },
    rightOrBottom: { x: 100, y: 0 },
  },
  {
    name: "vertical turn in spread: steps one page height per turn",
    scenario: VERTICAL_TURN_SPREAD,
    from: { x: 100, y: 0 },
    leftOrTop: { x: 0, y: 0 },
    rightOrBottom: { x: 0, y: 100 },
  },
  {
    name: "scrollable vertical: turns are a continuous page height offset",
    scenario: SCROLLABLE_VERTICAL,
    from: { x: 150, y: 150 },
    leftOrTop: { x: 150, y: 50 },
    rightOrBottom: { x: 150, y: 250 },
  },
]

describe("getNavigationForPage direction handling", () => {
  for (const testCase of CASES) {
    it(testCase.name, () => {
      const from = new SpinePosition(testCase.from)

      expect(resolve(testCase.scenario, from, "leftOrTop")).toMatchObject(
        testCase.leftOrTop,
      )
      expect(resolve(testCase.scenario, from, "rightOrBottom")).toMatchObject(
        testCase.rightOrBottom,
      )
    })
  }
})
