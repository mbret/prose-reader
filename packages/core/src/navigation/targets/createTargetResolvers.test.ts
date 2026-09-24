import { describe, expect, it } from "vitest"
import type { CfiManager } from "../../cfi"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { SpinePosition } from "../../spine/types"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry, NavigationTarget } from "../types"
import { createTargetResolvers } from "./createTargetResolvers"
import type { TargetResolution } from "./types"

const itemStart = "epubcfi(/6/2[0]!)"
const text = "epubcfi(/6/2[0]!/4/8/1:0)"

const createResolvers = () => {
  const navigationResolver = {
    clampPositionInSpine: (position: SpinePosition) => position,
    getNavigationForCfi: () => new SpinePosition({ x: 0, y: 0 }),
    getNavigationForUrl: () => ({
      position: new SpinePosition({ x: 0, y: 0 }),
      spineItemId: "0",
    }),
  }
  const cfi = {
    isRootCfi: (value: string) => value.endsWith("!)"),
    getSpineItemFromCfi: () => ({ index: 0 }),
  }
  const settings = { values: { computedPageTurnDirection: "horizontal" } }

  return createTargetResolvers({
    // The resolvers only read the members above, so partial objects stand in
    // for the real ones.
    navigationResolver: navigationResolver as unknown as NavigationResolver,
    cfi: cfi as unknown as CfiManager,
    settings: settings as unknown as ReaderSettingsManager,
    getNavigationVisibleArea: () => ({ width: 100, height: 100 }),
  })
}

const previousNavigation = {
  position: new SpinePosition({ x: 0, y: 0 }),
  // A navigation entry carries far more; the resolvers read only these.
} as InternalNavigationEntry

const resolve = (target: NavigationTarget): TargetResolution => {
  const resolvers = createResolvers()
  const context = { previousNavigation }

  switch (target.type) {
    case "position":
      return resolvers.position(target.value, context)
    case "spineItem":
      return resolvers.spineItem(target.value, context)
    case "cfi":
      return resolvers.cfi(target.value, context)
    case "url":
      return resolvers.url(target.value, context)
  }
}

describe("target resolvers", () => {
  it("anchor a cfi navigation at the cfi", () => {
    expect(resolve({ type: "cfi", value: text }).anchor).toBe(text)
  })

  it("leave a cfi naming only an item to be anchored at the page it lands on", () => {
    // A book reopened at a saved item start lands on the item's first page.
    expect(resolve({ type: "cfi", value: itemStart }).anchor).toBeUndefined()
  })

  it.each<[string, NavigationTarget, boolean]>([
    ["a cfi", { type: "cfi", value: text }, true],
    ["a url", { type: "url", value: "https://book/0.xhtml#note" }, true],
    [
      "a position",
      { type: "position", value: new SpinePosition({ x: 10, y: 0 }) },
      false,
    ],
    ["a spine item", { type: "spineItem", value: 0 }, false],
  ])(
    "tell whether %s goes exactly to its position, or to the page it falls on",
    (_, target, isExact) => {
      expect(resolve(target).isExact).toBe(isExact)
    },
  )
})
