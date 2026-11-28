import { describe, expect, it, onTestFinished, vi } from "vitest"
import { getFirstNodeInBox } from "./dom.ts"

type Rect = { x: number; y: number; width: number; height: number }

/**
 * A document of paragraphs, each laid out at the rect given for it. The
 * paragraph and its text measure the same rect.
 */
const createDocumentOfParagraphs = (paragraphRects: Rect[]) => {
  const paragraphs = paragraphRects.map(({ x, y, width, height }, index) => {
    const paragraph = document.createElement("p")
    const rect = new DOMRect(x, y, width, height)

    paragraph.textContent = `paragraph ${index}`
    vi.spyOn(paragraph, "getBoundingClientRect").mockReturnValue(rect)

    return { paragraph, rect }
  })
  const bodyRect = new DOMRect(0, 0, 2400, 2400)

  vi.spyOn(document.body, "getBoundingClientRect").mockReturnValue(bodyRect)
  document.body.replaceChildren(...paragraphs.map(({ paragraph }) => paragraph))
  onTestFinished(() => document.body.replaceChildren())

  vi.spyOn(Range.prototype, "getClientRects").mockImplementation(function (
    this: Range,
  ) {
    const measured = paragraphs.find(
      ({ paragraph }) => paragraph.firstChild === this.startContainer,
    )

    // Cast: the lookup reads the rects of the list as an array.
    return (measured ? [measured.rect] : []) as unknown as DOMRectList
  })

  return paragraphs.map(({ paragraph }) => paragraph)
}

describe("getFirstNodeInBox", () => {
  it("finds the first node whose box overlaps the box on both axes", () => {
    // The first paragraph is on the page below, as in vertical writing.
    const paragraphs = createDocumentOfParagraphs([
      { x: 0, y: 800, width: 600, height: 800 },
      { x: 0, y: 0, width: 600, height: 800 },
    ])

    expect(
      getFirstNodeInBox(document, { left: 0, right: 600, top: 0, bottom: 800 })
        ?.node,
    ).toBe(paragraphs[1]?.firstChild)
  })

  it("skips a node whose box only touches an edge of the box", () => {
    // The first paragraph starts on the next page, as in a right-to-left item.
    const paragraphs = createDocumentOfParagraphs([
      { x: 600, y: 0, width: 600, height: 800 },
      { x: 0, y: 0, width: 600, height: 800 },
    ])

    expect(
      getFirstNodeInBox(document, { left: 0, right: 600, top: 0, bottom: 800 })
        ?.node,
    ).toBe(paragraphs[1]?.firstChild)
  })
})

describe("getFirstNodeInBox, the order of the nodes of an element", () => {
  const box = { left: 0, right: 600, top: 0, bottom: 800 }
  const rectInBox = new DOMRect(0, 0, 600, 20)
  const rectOutOfBox = new DOMRect(-600, 0, 600, 20)

  /**
   * Lays `html` out in the body. `getRectOfNode` gives the rect of each
   * element and of each text, and nothing for a node with no box.
   */
  const layOutBody = (
    html: string,
    getRectOfNode: (node: Node) => DOMRect | undefined,
  ) => {
    document.body.innerHTML = html
    onTestFinished(() => document.body.replaceChildren())

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return getRectOfNode(this) ?? new DOMRect()
      },
    )

    return vi
      .spyOn(Range.prototype, "getClientRects")
      .mockImplementation(function (this: Range) {
        const rect = getRectOfNode(this.startContainer)

        // Cast: the lookup reads the rects of the list as an array.
        return (rect ? [rect] : []) as unknown as DOMRectList
      })
  }

  const getTextOf = (selector: string) => {
    const text = document.querySelector(selector)?.firstChild

    if (!text) throw new Error(`${selector} has no text`)

    return text
  }

  it("finds the text of an element before the inline element that follows it", () => {
    layOutBody(`<p>One <em>two</em></p>`, () => rectInBox)

    expect(getFirstNodeInBox(document, box)).toEqual({
      node: getTextOf("p"),
      offset: 0,
    })
  })

  it("finds an inline element when the text before it is out of the box", () => {
    layOutBody(`<p>One <em>two</em></p>`, (node) =>
      node === getTextOf("p") ? rectOutOfBox : rectInBox,
    )

    expect(getFirstNodeInBox(document, box)?.node).toBe(getTextOf("em"))
  })

  it("finds the text of an element that has no box of its own", () => {
    // An element with `display: contents` measures an empty rect.
    layOutBody(`<p><span>One</span> two</p>`, (node) =>
      node === document.querySelector("span") ? undefined : rectInBox,
    )

    expect(getFirstNodeInBox(document, box)?.node).toBe(getTextOf("span"))
  })

  it("skips a blank text, which a page never starts with", () => {
    layOutBody(`<div> <p>One</p></div>`, () => rectInBox)

    expect(getFirstNodeInBox(document, box)?.node).toBe(getTextOf("p"))
  })

  it("gives an element in the box that has nothing in it to find", () => {
    layOutBody(`<p><img /></p>`, () => rectInBox)

    expect(getFirstNodeInBox(document, box)).toEqual({
      node: document.querySelector("img"),
      offset: 0,
    })
  })

  it("finds a node in the box whose parent is out of it, as a positioned child can be", () => {
    layOutBody(`<div><p>One</p></div><p id="after">Two</p>`, (node) =>
      node === document.querySelector("div") ? rectOutOfBox : rectInBox,
    )

    expect(getFirstNodeInBox(document, box)?.node).toBe(getTextOf("p"))
  })

  it("does not measure the text of the elements that are out of the box", () => {
    const getClientRects = layOutBody(
      `<p id="before-1">One</p><p id="before-2">Two</p><p id="in-box">Three</p>`,
      (node) => {
        const element =
          node.nodeType === Node.TEXT_NODE ? node.parentNode : node

        return element instanceof Element && element.id.startsWith("before")
          ? rectOutOfBox
          : rectInBox
      },
    )

    expect(getFirstNodeInBox(document, box)?.node).toBe(getTextOf("#in-box"))
    expect(getClientRects).toHaveBeenCalledTimes(1)
  })
})

describe("getFirstNodeInBox, the offset in the first node", () => {
  /**
   * Records each point the lookup asks a caret for, and answers every one
   * with a caret at `offset` in `offsetNode`.
   */
  const stubCaretPositionFromPoint = (offsetNode: Node, offset: number) => {
    const points: { x: number; y: number }[] = []

    Object.defineProperty(document, "caretPositionFromPoint", {
      configurable: true,
      value: (x: number, y: number) => {
        points.push({ x, y })

        return { offsetNode, offset }
      },
    })
    onTestFinished(() => {
      Reflect.deleteProperty(document, "caretPositionFromPoint")
    })

    return points
  }

  const box = { left: 0, right: 600, top: 0, bottom: 800 }

  it("reads the caret at the left edge of a line written left to right", () => {
    const [paragraph] = createDocumentOfParagraphs([
      { x: 100, y: 10, width: 400, height: 20 },
    ])
    const text = paragraph?.firstChild

    if (!text) throw new Error("the paragraph has no text")

    const points = stubCaretPositionFromPoint(text, 3)

    expect(getFirstNodeInBox(document, box)).toEqual({ node: text, offset: 3 })
    expect(points).toEqual([{ x: 100, y: 10 }])
  })

  it("gives the start of the node when the caret at the start of its line is in another node", () => {
    const [paragraph] = createDocumentOfParagraphs([
      { x: 100, y: 10, width: 400, height: 20 },
    ])
    const text = paragraph?.firstChild

    if (!text) throw new Error("the paragraph has no text")

    stubCaretPositionFromPoint(document.body, 3)

    expect(getFirstNodeInBox(document, box)).toEqual({ node: text, offset: 0 })
  })

  it("reads the caret at the right edge of a line written right to left, where it starts", () => {
    const [paragraph] = createDocumentOfParagraphs([
      { x: 100, y: 10, width: 400, height: 20 },
    ])
    const text = paragraph?.firstChild

    if (!paragraph || !text) throw new Error("the paragraph has no text")

    paragraph.style.direction = "rtl"

    const points = stubCaretPositionFromPoint(text, 3)

    expect(getFirstNodeInBox(document, box)).toEqual({ node: text, offset: 3 })
    expect(points).toEqual([{ x: 499, y: 10 }])
  })

  it("reads the caret inside a line written right to left that is under two pixels wide", () => {
    const [paragraph] = createDocumentOfParagraphs([
      { x: 100.5, y: 10, width: 1.2, height: 20 },
    ])
    const text = paragraph?.firstChild

    if (!paragraph || !text) throw new Error("the paragraph has no text")

    paragraph.style.direction = "rtl"

    const points = stubCaretPositionFromPoint(text, 0)

    getFirstNodeInBox(document, box)

    expect(points).toEqual([{ x: 101, y: 10 }])
  })
})
