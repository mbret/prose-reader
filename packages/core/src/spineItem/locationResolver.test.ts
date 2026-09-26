// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Context } from "../context/Context"
import type { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import type { Viewport } from "../viewport/Viewport"
import { createSpineItemLocator } from "./locationResolver"
import type { SpineItem } from "./SpineItem"

/** Pages 100 wide, in an item five pages wide. */
const pageWidth = 100

const locator = createSpineItemLocator({
  // The locator reads nothing else of them to place a node.
  context: {} as unknown as Context,
  settings: {} as unknown as ReaderSettingsManager,
  viewport: {
    pageSize: { width: pageWidth, height: 200 },
  } as unknown as Viewport,
})

// Only its width places a node.
const spineItem = {
  layoutInfo: { width: 5 * pageWidth, height: 200 },
} as unknown as SpineItem

/** Boxes laid out at `x`, as a browser reports them. */
const laidOutAt = (x: number) => [new DOMRect(x, 0, 10, 20)]

/**
 * jsdom lays nothing out, and its ranges have no boxes at all. Here the ranges
 * the document creates lay out `rangeBoxes`, and an element `elementBoxes`.
 */
const layOut = ({
  rangeBoxes,
  element,
  elementBoxes = [],
}: {
  rangeBoxes: DOMRect[]
  element?: Element
  elementBoxes?: DOMRect[]
}) => {
  const range = document.createRange()

  range.getClientRects = () => rangeBoxes as unknown as DOMRectList
  range.getBoundingClientRect = () => rangeBoxes[0] ?? new DOMRect()
  vi.spyOn(document, "createRange").mockReturnValue(range)

  if (element) {
    element.getClientRects = () => elementBoxes as unknown as DOMRectList
    element.getBoundingClientRect = () => elementBoxes[0] ?? new DOMRect()
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("the position of a node in its spine item", () => {
  it.each([
    ["the item's left edge, the first page's", 0, 0],
    ["inside the first page", 30, 0],
    ["inside the third page", 230, 200],
  ])("is the page it is laid out on, for text laid out at %s", (_, x, page) => {
    const text = document.createTextNode("Some text")

    layOut({ rangeBoxes: laidOutAt(x) })

    expect(locator.getSpineItemPositionFromNode(text, 0, spineItem)).toEqual(
      expect.objectContaining({ x: page, y: 0 }),
    )
  })

  it.each([
    ["the item's left edge", 0, 0],
    ["the third page", 230, 200],
  ])(
    "is the page of its own box for an image, whose contents lay out nothing, at %s",
    (_, x, page) => {
      const image = document.createElement("img")

      layOut({ rangeBoxes: [], element: image, elementBoxes: laidOutAt(x) })

      expect(locator.getSpineItemPositionFromNode(image, 0, spineItem)).toEqual(
        expect.objectContaining({ x: page, y: 0 }),
      )
    },
  )

  it("is none for a node laid out nowhere, as when it is hidden", () => {
    const hidden = document.createElement("span")

    hidden.append("Hidden text")
    layOut({ rangeBoxes: [], element: hidden, elementBoxes: [] })

    expect(
      locator.getSpineItemPositionFromNode(hidden, 0, spineItem),
    ).toBeUndefined()
  })
})
