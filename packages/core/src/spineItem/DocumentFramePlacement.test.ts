import { describe, expect, it, onTestFinished, vi } from "vitest"
import { DocumentFramePlacement } from "./DocumentFramePlacement"

type RenderedBox = {
  left: number
  top: number
  width: number
  height: number
  layoutWidth: number
  layoutHeight: number
}

/**
 * An element of `layoutWidth` by `layoutHeight`, rendered at `left` and `top`
 * in the window, `width` by `height` there: a transform of the element or of
 * an ancestor scales one size into the other.
 */
const createRenderedElement = (
  tagName: "div" | "iframe",
  { left, top, width, height, layoutWidth, layoutHeight }: RenderedBox,
) => {
  const element = document.createElement(tagName)

  // The computed style of an element has its size once in a document.
  document.body.appendChild(element)
  onTestFinished(() => element.remove())
  element.style.width = `${layoutWidth}px`
  element.style.height = `${layoutHeight}px`
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(
    new DOMRect(left, top, width, height),
  )
  // A browser rounds these to whole pixels.
  vi.spyOn(element, "offsetWidth", "get").mockReturnValue(
    Math.round(layoutWidth),
  )
  vi.spyOn(element, "offsetHeight", "get").mockReturnValue(
    Math.round(layoutHeight),
  )

  return element
}

const measure = (item: RenderedBox, frame?: RenderedBox) =>
  DocumentFramePlacement.measure({
    itemElement: createRenderedElement("div", item),
    frameElement: frame ? createRenderedElement("iframe", frame) : undefined,
  })

const unscaledItem = {
  left: -1200,
  top: 0,
  width: 1200,
  height: 800,
  layoutWidth: 1200,
  layoutHeight: 800,
}

describe("DocumentFramePlacement", () => {
  it("leaves a position as it is in an item without a frame", () => {
    expect(
      measure(unscaledItem).toSpineItemPosition({ x: 10, y: 20 }),
    ).toMatchObject({ x: 10, y: 20 })
  })

  it("moves a position of the frame by the frame's offset in its item, as a blank page to its left does", () => {
    const placement = measure(unscaledItem, {
      left: -600,
      top: 0,
      width: 600,
      height: 800,
      layoutWidth: 600,
      layoutHeight: 800,
    })

    expect(placement.toSpineItemPosition({ x: 10, y: 20 })).toMatchObject({
      x: 610,
      y: 20,
    })
    expect(
      placement.toFrameBox({ left: 600, right: 1200, top: 0, bottom: 800 }),
    ).toEqual({ left: 0, right: 600, top: 0, bottom: 800 })
  })

  it("scales a position of the frame by the frame's own scale, whatever the scale of its item", () => {
    // The item renders at twice its layout size, and the frame in it at half
    // its own.
    const placement = measure(
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
    )

    expect(placement.toSpineItemPosition({ x: 100, y: 100 })).toMatchObject({
      x: 250,
      y: 150,
    })
    expect(
      placement.toFrameBox({ left: 250, right: 450, top: 150, bottom: 550 }),
    ).toEqual({ left: 100, right: 500, top: 100, bottom: 900 })
  })

  /**
   * A page half of an odd window width has a fractional width, which
   * `offsetWidth` would round.
   */
  it("finds no scale in a frame of a fractional width", () => {
    const placement = measure(
      {
        left: 0,
        top: 0,
        width: 6825,
        height: 800,
        layoutWidth: 6825,
        layoutHeight: 800,
      },
      {
        left: 682.5,
        top: 0,
        width: 6142.5,
        height: 800,
        layoutWidth: 6142.5,
        layoutHeight: 800,
      },
    )

    expect(placement.toSpineItemPosition({ x: 5460, y: 0 })).toMatchObject({
      x: 6142.5,
      y: 0,
    })
  })
})
