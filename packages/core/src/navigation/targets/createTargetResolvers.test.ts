import { describe, expect, it } from "vitest"
import type { CfiManager } from "../../cfi"
import type { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import type { SpineItemsManager } from "../../spine/SpineItemsManager"
import { SpinePosition } from "../../spine/types"
import type { NavigationResolver } from "../resolvers/NavigationResolver"
import type { InternalNavigationEntry, NavigationTarget } from "../types"
import { createTargetResolvers } from "./createTargetResolvers"
import type { TargetResolution } from "./types"

const itemStart = "epubcfi(/6/2[0]!)"
const text = "epubcfi(/6/2[0]!/4/8/1:0)"

/** The item's document, holding the element a selector selects. */
const document = new DOMParser().parseFromString(
  `<html><body><p id="note">A note</p></body></html>`,
  "text/html",
)

const createResolvers = ({ isLoaded = true }: { isLoaded?: boolean } = {}) => {
  const navigationResolver = {
    clampPositionInSpine: (position: SpinePosition) => position,
    getNavigationForCfi: () => new SpinePosition({ x: 0, y: 0 }),
  }
  const item = { index: 0, href: "0.xhtml" }
  const cfi = {
    isRootCfi: (value: string) => value.endsWith("!)"),
    getSpineItemFromCfi: () => ({ index: 0 }),
    generateRootCfi: () => itemStart,
    generateCfiForSpineItemPage: ({
      pageNode,
    }: {
      pageNode: { node: Node }
    }) => (pageNode.node === document.getElementById("note") ? text : "other"),
  }
  const spineItemsManager = {
    get: () => ({
      item,
      value: { isLoaded },
      renderer: { getDocumentFrame: () => ({ contentDocument: document }) },
    }),
  }
  const settings = { values: { computedPageTurnDirection: "horizontal" } }

  return createTargetResolvers({
    // The resolvers only read the members above, so partial objects stand in
    // for the real ones.
    navigationResolver: navigationResolver as unknown as NavigationResolver,
    cfi: cfi as unknown as CfiManager,
    settings: settings as unknown as ReaderSettingsManager,
    spineItemsManager: spineItemsManager as unknown as SpineItemsManager,
    getNavigationVisibleArea: () => ({ width: 100, height: 100 }),
  })
}

const previousNavigation = {
  position: new SpinePosition({ x: 0, y: 0 }),
  // A navigation entry carries far more; the resolvers read only these.
} as InternalNavigationEntry

const resolve = (
  target: NavigationTarget,
  options?: Parameters<typeof createResolvers>[0],
): TargetResolution => {
  const resolvers = createResolvers(options)
  const context = { previousNavigation }

  switch (target.type) {
    case "position":
      return resolvers.position(target.value, context)
    case "spineItem":
      return resolvers.spineItem(target.value, context)
    case "cfi":
      return resolvers.cfi(target.value, context)
    case "selector":
      return resolvers.selector(target.value, context)
  }
}

const note: NavigationTarget = {
  type: "selector",
  value: {
    spineItem: 0,
    select: (document) => {
      const node = document.getElementById("note")

      return node ? { node } : undefined
    },
  },
}

describe("target resolvers", () => {
  it("anchor a cfi navigation at the cfi", () => {
    expect(resolve({ type: "cfi", value: text }).anchor).toBe(text)
  })

  it("leave a cfi naming only an item to be anchored at the page it lands on", () => {
    // A book reopened at a saved item start lands on the item's first page.
    expect(resolve({ type: "cfi", value: itemStart }).anchor).toBeUndefined()
  })

  it("anchor a selector navigation at the cfi of what it selects", () => {
    expect(resolve(note).anchor).toBe(text)
  })

  it("leave a selector its item has not loaded pending, without an anchor, for restorations to try again", () => {
    expect(resolve(note, { isLoaded: false })).toMatchObject({
      spineItem: 0,
      anchor: undefined,
      isPending: true,
    })
  })

  it("take a selector that throws as selecting nothing, rather than failing the navigation", () => {
    const throwing: NavigationTarget = {
      type: "selector",
      value: {
        spineItem: 0,
        select: () => {
          throw new Error("a bug in the selector")
        },
      },
    }

    expect(resolve(throwing)).toMatchObject({
      spineItem: 0,
      anchor: undefined,
      isPending: false,
    })
  })

  it("no longer wait for a document a selector did not select anything in", () => {
    const missing: NavigationTarget = {
      type: "selector",
      value: { spineItem: 0, select: () => undefined },
    }

    // The item start then anchors at the page it lands on, like a root cfi.
    expect(resolve(missing)).toMatchObject({
      anchor: undefined,
      isPending: false,
    })
  })

  it.each<[string, NavigationTarget, boolean]>([
    ["a cfi", { type: "cfi", value: text }, true],
    ["a selector", note, true],
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
