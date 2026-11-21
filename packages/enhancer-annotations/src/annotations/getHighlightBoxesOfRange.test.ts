// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { getHighlightBoxesOfRange } from "./getHighlightBoxesOfRange.ts"

const CHARACTER_SIZE = 10
const LINE_THICKNESS = 20

/**
 * Where a text node lays out its characters, all on one line: across from
 * `left`, or down from `top` when the line is vertical.
 */
type FakeTextLayout = {
  left: number
  top: number
  thickness?: number
  isVertical?: boolean
}

const fakeTextLayouts = new Map<Node, FakeTextLayout>()

/**
 * jsdom has no layout, and its ranges have no `getClientRects`. This one
 * measures a range inside one text node from the node's fake layout, and
 * refuses any other range: a highlight that measured one would also get the
 * boxes of the elements it selects.
 */
function getClientRectsOfFakeLayout(this: Range) {
  if (this.startContainer !== this.endContainer) {
    throw new Error("the fake layout measures ranges inside one text node")
  }

  const layout = fakeTextLayouts.get(this.startContainer)

  if (!layout) return []

  const { left, top, thickness = LINE_THICKNESS, isVertical = false } = layout
  const start = this.startOffset * CHARACTER_SIZE
  const length = (this.endOffset - this.startOffset) * CHARACTER_SIZE

  return [
    isVertical
      ? new DOMRect(left, top + start, thickness, length)
      : new DOMRect(left + start, top, length, thickness),
  ]
}

const getText = (node: ChildNode | null | undefined) => {
  if (node?.nodeType !== Node.TEXT_NODE) throw new Error("not a text node")

  return node
}

const layOutText = (
  node: ChildNode | null | undefined,
  layout: FakeTextLayout,
) => fakeTextLayouts.set(getText(node), layout)

const layOutElement = (selector: string, box: DOMRect) => {
  const element = document.querySelector(selector)

  if (!element) throw new Error(`no element ${selector}`)

  Object.defineProperty(element, "getClientRects", { value: () => [box] })
}

const createRange = (
  [startNode, startOffset]: [ChildNode | null | undefined, number],
  [endNode, endOffset]: [ChildNode | null | undefined, number],
) => {
  const range = document.createRange()

  range.setStart(getText(startNode), startOffset)
  range.setEnd(getText(endNode), endOffset)

  return range
}

const firstTextOf = (selector: string) =>
  document.querySelector(selector)?.firstChild

beforeEach(() => {
  Object.defineProperty(Range.prototype, "getClientRects", {
    configurable: true,
    value: getClientRectsOfFakeLayout,
  })
})

afterEach(() => {
  Reflect.deleteProperty(Range.prototype, "getClientRects")
  fakeTextLayouts.clear()
  document.body.innerHTML = ""
  document.body.removeAttribute("style")
})

describe("getHighlightBoxesOfRange", () => {
  it("gives a box for each line of the text that the range covers, and none for the paragraphs that it selects whole", () => {
    document.body.innerHTML = `<p id="first">0123456789</p><p id="middle">aaaa<em>bbbb</em>cccc</p><p id="last">0123456789</p>`
    layOutElement("#middle", new DOMRect(0, 20, 100, 40))
    layOutText(firstTextOf("#first"), { left: 0, top: 0 })
    layOutText(firstTextOf("#middle"), { left: 0, top: 20 })
    layOutText(firstTextOf("#middle em"), { left: 40, top: 20 })
    layOutText(document.querySelector("#middle")?.lastChild, {
      left: 0,
      top: 40,
    })
    layOutText(firstTextOf("#last"), { left: 0, top: 60 })

    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#first"), 4], [firstTextOf("#last"), 6]),
      ),
    ).toEqual([
      { left: 40, top: 0, right: 100, bottom: 20 },
      { left: 0, top: 20, right: 80, bottom: 40 },
      { left: 0, top: 40, right: 40, bottom: 60 },
      { left: 0, top: 60, right: 60, bottom: 80 },
    ])
  })

  it("paints an image or an svg that the range selects whole with its box, and none of the svg's text", () => {
    document.body.innerHTML = `<p id="before">0123456789</p><img id="image" /><svg id="drawing"><text>abc</text></svg><p id="after">0123456789</p>`
    layOutText(firstTextOf("#before"), { left: 0, top: 0 })
    layOutElement("#image", new DOMRect(0, 20, 100, 50))
    layOutElement("#drawing", new DOMRect(0, 70, 100, 50))
    layOutText(firstTextOf("#drawing text"), { left: 10, top: 80 })
    layOutText(firstTextOf("#after"), { left: 0, top: 120 })

    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#before"), 5], [firstTextOf("#after"), 5]),
      ),
    ).toEqual([
      { left: 50, top: 0, right: 100, bottom: 20 },
      { left: 0, top: 20, right: 100, bottom: 70 },
      { left: 0, top: 70, right: 100, bottom: 120 },
      { left: 0, top: 120, right: 50, bottom: 140 },
    ])
  })

  it("paints the text of an svg that the range ends inside, and not the box of the svg", () => {
    document.body.innerHTML = `<p id="before">0123456789</p><svg id="drawing"><text>abc</text></svg>`
    layOutText(firstTextOf("#before"), { left: 0, top: 0 })
    layOutElement("#drawing", new DOMRect(0, 20, 100, 50))
    layOutText(firstTextOf("#drawing text"), { left: 10, top: 30 })

    expect(
      getHighlightBoxesOfRange(
        createRange(
          [firstTextOf("#before"), 5],
          [firstTextOf("#drawing text"), 2],
        ),
      ),
    ).toEqual([
      { left: 50, top: 0, right: 100, bottom: 20 },
      { left: 10, top: 30, right: 30, bottom: 50 },
    ])
  })

  it("paints a line in one box across the padding of an inline element whose text is not as high", () => {
    document.body.innerHTML = `<p id="paragraph">aaaa<code>bbbb</code></p>`
    layOutText(firstTextOf("#paragraph"), { left: 0, top: 0 })
    layOutText(firstTextOf("#paragraph code"), {
      left: 44,
      top: 2,
      thickness: 16,
    })

    expect(
      getHighlightBoxesOfRange(
        createRange(
          [firstTextOf("#paragraph"), 0],
          [firstTextOf("#paragraph code"), 4],
        ),
      ),
    ).toEqual([{ left: 0, top: 0, right: 84, bottom: 20 }])
  })

  it("starts a new box where the text goes on at the same height in the next column", () => {
    document.body.innerHTML = `<p id="first">0123456789</p><p id="next">0123456789</p>`
    layOutText(firstTextOf("#first"), { left: 0, top: 0 })
    layOutText(firstTextOf("#next"), { left: 148, top: 0 })

    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#first"), 0], [firstTextOf("#next"), 10]),
      ),
    ).toEqual([
      { left: 0, top: 0, right: 100, bottom: 20 },
      { left: 148, top: 0, right: 248, bottom: 20 },
    ])
  })

  it("paints each vertical line of the text in one box, when the lines run down", () => {
    document.body.innerHTML = `<p id="first">aaaa<em>bbbb</em></p><p id="next">cccc</p>`
    document.body.style.writingMode = "vertical-rl"
    layOutText(firstTextOf("#first"), { left: 100, top: 0, isVertical: true })
    layOutText(firstTextOf("#first em"), {
      left: 100,
      top: 40,
      isVertical: true,
    })
    layOutText(firstTextOf("#next"), { left: 80, top: 0, isVertical: true })

    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#first"), 0], [firstTextOf("#next"), 4]),
      ),
    ).toEqual([
      { left: 100, top: 0, right: 120, bottom: 80 },
      { left: 80, top: 0, right: 100, bottom: 40 },
    ])
  })
})
