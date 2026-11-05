import { describe, expect, it } from "vitest"
import { getPositionRelativeToNonTransformedElement } from "./coordinates"

/** An element laid out at `layout` and drawn at `rendered`, as a transform draws it. */
const elementAt = ({
  layout,
  rendered,
}: {
  layout: { width: number; height: number }
  rendered: DOMRect
}) => {
  const element = document.createElement("div")

  Object.defineProperties(element, {
    offsetWidth: { value: layout.width },
    offsetHeight: { value: layout.height },
  })
  element.getBoundingClientRect = () => rendered

  return element
}

describe("Given a position over an element", () => {
  it("gives it in the element's own coordinates, undoing its scale", () => {
    const element = elementAt({
      layout: { width: 100, height: 100 },
      rendered: new DOMRect(10, 20, 200, 200),
    })

    expect(
      getPositionRelativeToNonTransformedElement({ x: 110, y: 120 }, element),
    ).toEqual({ x: 50, y: 50 })
  })

  it("gives it unscaled when the element is hidden, since it has no size to scale by", () => {
    const element = elementAt({
      layout: { width: 0, height: 0 },
      rendered: new DOMRect(0, 0, 0, 0),
    })

    expect(
      getPositionRelativeToNonTransformedElement({ x: 110, y: 120 }, element),
    ).toEqual({ x: 110, y: 120 })
  })
})
