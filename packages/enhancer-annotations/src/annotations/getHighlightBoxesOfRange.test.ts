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

type BoundaryPoint = [Node | null | undefined, number]

const createRange = (
  [startNode, startOffset]: BoundaryPoint,
  [endNode, endOffset]: BoundaryPoint,
) => {
  if (!startNode || !endNode) throw new Error("no node for the range")

  const range = document.createRange()

  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)

  return range
}

const firstTextOf = (selector: string) =>
  document.querySelector(selector)?.firstChild

const elementOf = (selector: string) => document.querySelector(selector)

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
        { isUsingVerticalWriting: false },
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
        { isUsingVerticalWriting: false },
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
        { isUsingVerticalWriting: false },
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
        { isUsingVerticalWriting: false },
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
        { isUsingVerticalWriting: false },
      ),
    ).toEqual([
      { left: 0, top: 0, right: 100, bottom: 20 },
      { left: 148, top: 0, right: 248, bottom: 20 },
    ])
  })

  it("paints each vertical line of the text in one box, when the lines run down", () => {
    document.body.innerHTML = `<p id="first">aaaa<em>bbbb</em></p><p id="next">cccc</p>`
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
        { isUsingVerticalWriting: true },
      ),
    ).toEqual([
      { left: 100, top: 0, right: 120, bottom: 80 },
      { left: 80, top: 0, right: 100, bottom: 40 },
    ])
  })

  it("paints an image on a line by its own box, apart from the text around it", () => {
    document.body.innerHTML = `<p id="paragraph">aaaa<img id="icon" />bbbb</p>`
    layOutText(firstTextOf("#paragraph"), { left: 0, top: 0 })
    layOutElement("#icon", new DOMRect(40, -2, 24, 24))
    layOutText(elementOf("#paragraph")?.lastChild, { left: 64, top: 0 })

    expect(
      getHighlightBoxesOfRange(
        createRange(
          [firstTextOf("#paragraph"), 0],
          [elementOf("#paragraph")?.lastChild, 4],
        ),
        { isUsingVerticalWriting: false },
      ),
    ).toEqual([
      { left: 0, top: 0, right: 40, bottom: 20 },
      { left: 40, top: -2, right: 64, bottom: 22 },
      { left: 64, top: 0, right: 104, bottom: 20 },
    ])
    expect(
      getHighlightBoxesOfRange(
        createRange([elementOf("#paragraph"), 1], [elementOf("#paragraph"), 2]),
        { isUsingVerticalWriting: false },
      ),
    ).toEqual([{ left: 40, top: -2, right: 64, bottom: 22 }])
  })

  it("keeps a drop cap apart from the lines of text beside it", () => {
    document.body.innerHTML = `<p id="paragraph"><span id="drop-cap">T</span>he story<br />goes on</p>`
    layOutText(firstTextOf("#drop-cap"), { left: 0, top: 0, thickness: 64 })
    layOutText(elementOf("#paragraph")?.childNodes.item(1), {
      left: 12,
      top: 0,
    })
    layOutText(elementOf("#paragraph")?.lastChild, { left: 12, top: 20 })

    expect(
      getHighlightBoxesOfRange(
        createRange(
          [firstTextOf("#drop-cap"), 0],
          [elementOf("#paragraph")?.lastChild, 4],
        ),
        { isUsingVerticalWriting: false },
      ),
    ).toEqual([
      { left: 0, top: 0, right: 10, bottom: 64 },
      { left: 12, top: 0, right: 92, bottom: 20 },
      { left: 12, top: 20, right: 52, bottom: 40 },
    ])
  })

  it("paints the content between the boundaries of a range that are in elements", () => {
    document.body.innerHTML = `<p id="first">0123456789</p><p id="middle">abcdefghij</p><p id="last">0123456789</p>`
    layOutText(firstTextOf("#first"), { left: 0, top: 0 })
    layOutText(firstTextOf("#middle"), { left: 0, top: 20 })
    layOutText(firstTextOf("#last"), { left: 0, top: 40 })

    expect(
      getHighlightBoxesOfRange(
        createRange([document.body, 1], [document.body, 2]),
        { isUsingVerticalWriting: false },
      ),
      "the boxes of a range over the second paragraph of the body",
    ).toEqual([{ left: 0, top: 20, right: 100, bottom: 40 }])
    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#first"), 5], [elementOf("#last"), 0]),
        { isUsingVerticalWriting: false },
      ),
      "the boxes of a range that ends at the start of the last paragraph",
    ).toEqual([
      { left: 50, top: 0, right: 100, bottom: 20 },
      { left: 0, top: 20, right: 100, bottom: 40 },
    ])
    expect(
      getHighlightBoxesOfRange(
        createRange([firstTextOf("#first"), 5], [elementOf("#middle"), 1]),
        { isUsingVerticalWriting: false },
      ),
      "the boxes of a range that ends after the last child of the middle paragraph",
    ).toEqual([
      { left: 50, top: 0, right: 100, bottom: 20 },
      { left: 0, top: 20, right: 100, bottom: 40 },
    ])
    expect(
      getHighlightBoxesOfRange(
        createRange([elementOf("#first"), 1], [firstTextOf("#last"), 6]),
        { isUsingVerticalWriting: false },
      ),
      "the boxes of a range that starts after the last child of the first paragraph",
    ).toEqual([
      { left: 0, top: 20, right: 100, bottom: 40 },
      { left: 0, top: 40, right: 60, bottom: 60 },
    ])
  })
})
