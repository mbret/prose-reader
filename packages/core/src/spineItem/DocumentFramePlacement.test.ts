import { describe, expect, it, vi } from "vitest"
import { DocumentFramePlacement } from "./DocumentFramePlacement"
import type { SpineItem } from "./SpineItem"

type RenderedBox = {
  left: number
  top: number
  width: number
  height: number
  layoutWidth: number
  layoutHeight: number
}

/**
 * An element rendered at `left` and `top` in the window, `width` by `height`
 * there, from a layout size of `layoutWidth` by `layoutHeight`: a transform
 * of the element or of an ancestor scales one into the other.
 */
const createRenderedElement = <Element extends HTMLElement>(
  element: Element,
  { left, top, width, height, layoutWidth, layoutHeight }: RenderedBox,
) => {
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    new DOMRect(left, top, width, height),
  )
  vi.spyOn(element, "offsetWidth", "get").mockReturnValue(layoutWidth)
  vi.spyOn(element, "offsetHeight", "get").mockReturnValue(layoutHeight)

  return element
}

const createSpineItem = (item: RenderedBox, frame?: RenderedBox) =>
  // Cast: the placement reads the item's container and its renderer's frame.
  ({
    containerElement: createRenderedElement(
      document.createElement("div"),
      item,
    ),
    renderer: {
      getDocumentFrame: () =>
        frame
          ? createRenderedElement(document.createElement("iframe"), frame)
          : undefined,
    },
  }) as unknown as SpineItem

const unscaledItem = {
  left: -1200,
  top: 0,
  width: 1200,
  height: 800,
  layoutWidth: 1200,
  layoutHeight: 800,
}

describe("DocumentFramePlacement", () => {
  it("places the document at the item's top-left corner, unscaled, in an item without a frame", () => {
    const placement = DocumentFramePlacement.measure(
      createSpineItem(unscaledItem),
    )

    expect(placement.toSpineItemPosition({ x: 10, y: 20 })).toMatchObject({
      x: 10,
      y: 20,
    })
  })

  it("moves a position of the document by the frame's offset in its item, as a blank page before it sets", () => {
    const placement = DocumentFramePlacement.measure(
      createSpineItem(unscaledItem, {
        left: -600,
        top: 0,
        width: 600,
        height: 800,
        layoutWidth: 600,
        layoutHeight: 800,
      }),
    )

    expect(placement.toSpineItemPosition({ x: 10, y: 20 })).toMatchObject({
      x: 610,
      y: 20,
    })
    expect(
      placement.toDocumentBox({ left: 600, right: 1200, top: 0, bottom: 800 }),
    ).toEqual({ left: 0, right: 600, top: 0, bottom: 800 })
  })

  it("scales a position of the document by the frame's own scale, whatever the scale of its item", () => {
    // The item is zoomed in twice, and the frame in it scaled down by half.
    const placement = DocumentFramePlacement.measure(
      createSpineItem(
        {
          left: 0,
          top: 0,
          width: 2400,
          height: 1600,
          layoutWidth: 1200,
          layoutHeight: 800,
        },
        {
          left: 400,
          top: 200,
          width: 1000,
          height: 1400,
          layoutWidth: 1000,
          layoutHeight: 1400,
        },
      ),
    )

    expect(placement.toSpineItemPosition({ x: 100, y: 100 })).toMatchObject({
      x: 250,
      y: 150,
    })
    expect(
      placement.toDocumentBox({ left: 250, right: 450, top: 150, bottom: 550 }),
    ).toEqual({ left: 100, right: 500, top: 100, bottom: 900 })
  })
})
