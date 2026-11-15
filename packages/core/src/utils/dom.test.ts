import { describe, expect, it, onTestFinished, vi } from "vitest"
import { getFirstNodeInBox } from "./dom"

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
