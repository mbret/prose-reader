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
// A path no node of the document has, as a saved position can once the book
// changed.
const nothing = "epubcfi(/6/2[0]!/4/999/1:0)"

/** The item's document, holding the element a selector finds. */
const document = new DOMParser().parseFromString(
  `<html><body><p id="note">A note</p></body></html>`,
  "text/html",
)

const createResolvers = ({
  isLoaded = true,
  hasDocument = true,
}: {
  isLoaded?: boolean
  // An item rendered without a document, such as an image, has none.
  hasDocument?: boolean
} = {}) => {
  const navigationResolver = {
    clampPositionInSpine: (position: SpinePosition) => position,
    getNavigationForNode: () => new SpinePosition({ x: 0, y: 0 }),
  }
  const spineItem = {
    item: { index: 0, href: "0.xhtml" },
    index: 0,
    value: { isLoaded },
    renderer: {
      getDocumentFrame: () =>
        hasDocument ? { contentDocument: document } : undefined,
    },
  }
  const cfi = {
    isRootCfi: (value: string) => value.endsWith("!)"),
    getSpineItemFromCfi: () => spineItem,
    // `text` names the note, once its document is there to look in.
    resolveCfi: ({ cfi }: { cfi: string }) => ({
      node:
        isLoaded && hasDocument && cfi === text
          ? document.getElementById("note")
          : null,
    }),
    generateRootCfi: () => itemStart,
    generateCfiForSpineItemPage: ({
      pageNode,
    }: {
      pageNode: { node: Node }
    }) => (pageNode.node === document.getElementById("note") ? text : "other"),
  }
  const spineItemsManager = { get: () => spineItem }
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
    find: (document) => {
      const node = document.getElementById("note")

      return node ? { node } : undefined
    },
  },
}

describe("target resolvers", () => {
  it("anchor a cfi navigation at the cfi, once its document shows it names a place", () => {
    expect(resolve({ type: "cfi", value: text })).toMatchObject({
      anchor: text,
      awaitsDocument: false,
    })
  })

  it.each([
    ["one naming a place", text],
    ["one naming nothing", nothing],
  ])(
    "leave a cfi into an item not loaded without an anchor, %s, awaiting the item for restorations to resolve it again",
    (_, value) => {
      /**
       * Nothing shows yet where the cfi leads, to a place or nowhere: as for a
       * selector, the navigation has no place until the item is loaded.
       */
      expect(
        resolve({ type: "cfi", value }, { isLoaded: false }),
      ).toMatchObject({
        spineItem: 0,
        anchor: undefined,
        awaitsDocument: true,
      })
    },
  )

  it.each<[string, NavigationTarget]>([
    ["a cfi", { type: "cfi", value: text }],
    ["a selector", note],
  ])(
    "leave %s into a loaded item without a document to be anchored at the page it lands on",
    (_, target) => {
      // No document will show where it leads, so it does not wait for one.
      expect(resolve(target, { hasDocument: false })).toMatchObject({
        anchor: undefined,
        awaitsDocument: false,
      })
    },
  )

  it("leave a cfi naming nothing in its loaded document to be anchored at the page it lands on", () => {
    expect(resolve({ type: "cfi", value: nothing })).toMatchObject({
      spineItem: 0,
      anchor: undefined,
      awaitsDocument: false,
    })
  })

  it.each([true, false])(
    "leave a cfi naming only an item to be anchored at the page it lands on, loaded: %s",
    (isLoaded) => {
      // A book reopened at a saved item start lands on the item's first page,
      // with nothing to look for in its document.
      expect(
        resolve({ type: "cfi", value: itemStart }, { isLoaded }),
      ).toMatchObject({ anchor: undefined, awaitsDocument: false })
    },
  )

  it("anchor a selector navigation at the cfi of what it finds", () => {
    expect(resolve(note).anchor).toBe(text)
  })

  it("leave a selector awaiting the document of an item not loaded, without an anchor, for restorations to try again", () => {
    expect(resolve(note, { isLoaded: false })).toMatchObject({
      spineItem: 0,
      anchor: undefined,
      awaitsDocument: true,
    })
  })

  it("take a selector that throws as finding nothing, rather than failing the navigation", () => {
    const throwing: NavigationTarget = {
      type: "selector",
      value: {
        spineItem: 0,
        find: () => {
          throw new Error("a bug in the selector")
        },
      },
    }

    expect(resolve(throwing)).toMatchObject({
      spineItem: 0,
      anchor: undefined,
      awaitsDocument: false,
    })
  })

  it("no longer wait for a document a selector did not find anything in", () => {
    const missing: NavigationTarget = {
      type: "selector",
      value: { spineItem: 0, find: () => undefined },
    }

    // The item start then anchors at the page it lands on, like a root cfi.
    expect(resolve(missing)).toMatchObject({
      anchor: undefined,
      awaitsDocument: false,
    })
  })

  it.each<[string, NavigationTarget, boolean]>([
    ["a cfi", { type: "cfi", value: text }, false],
    ["a selector", note, false],
    [
      "a position",
      { type: "position", value: new SpinePosition({ x: 10, y: 0 }) },
      true,
    ],
    ["a spine item", { type: "spineItem", value: 0 }, true],
  ])(
    "tell whether %s snaps to the page it falls on, or goes exactly to its position",
    (_, target, snapToPage) => {
      expect(resolve(target).snapToPage).toBe(snapToPage)
    },
  )
})
