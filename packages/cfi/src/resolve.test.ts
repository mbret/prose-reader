import { beforeEach, describe, expect, it } from "vitest"
import { parse } from "./parse"
import { resolve, resolveParsed } from "./resolve"

describe("EPUB CFI Resolve", () => {
  let _document: Document

  beforeEach(() => {
    // Create a new document for each test
    _document = new Document()

    // Create a simple document structure
    const html = _document.createElement("html")
    const body = _document.createElement("body")
    body.id = "body01"

    const div = _document.createElement("div")
    div.id = "content"

    const p1 = _document.createElement("p")
    p1.id = "chap01ref"
    p1.textContent = "This is paragraph 1"

    const p2 = _document.createElement("p")
    p2.id = "chap02ref"
    p2.textContent = "This is paragraph 2"

    div.appendChild(p1)
    div.appendChild(p2)
    body.appendChild(div)
    html.appendChild(body)
    _document.appendChild(html)
  })

  describe("resolve", () => {
    it("should resolve a simple CFI to a node", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
            <body>
                <div id="content">
                    <p id="chap01ref">This is paragraph 1</p>
                    <p id="chap02ref">This is paragraph 2</p>
                </div>
            </body>
        </html>`,
        "application/xhtml+xml",
      )
      const cfi = "/4/2[chap01ref]"
      const result = resolve(cfi, doc)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(doc.getElementById("chap01ref"))
    })

    it("should resolve a CFI with character offset", () => {
      const cfi = "/4/2[chap01ref]/1:5"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
      expect(result.offset).toBe(5)
    })

    it("should resolve a CFI with element ID", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
            <body>
                <div id="content">
                    <p id="chap01ref">This is paragraph 1</p>
                    <p id="chap02ref">This is paragraph 2</p>
                </div>
            </body>
        </html>`,
        "application/xhtml+xml",
      )
      const cfi = "/4/2[chap01ref]/2[chap02ref]"
      const result = resolve(cfi, doc)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(doc.getElementById("chap02ref"))
    })

    it("should resolve a CFI range", () => {
      const cfi = "/4/2[chap01ref]/1:5,/4/2[chap01ref]/2[chap02ref]/1:10"
      const result = resolve(cfi, _document, { asRange: true })

      expect(result.isRange).toBe(true)
      expect(result.node instanceof Range).toBe(true)

      const range = result.node as Range
      expect(range.startContainer).toBe(_document.getElementById("chap01ref"))
      expect(range.startOffset).toBe(5)
      expect(range.endContainer).toBe(_document.getElementById("chap02ref"))
      expect(range.endOffset).toBe(10)
    })

    it("should handle text assertions", () => {
      const cfi = "/4/2[chap01ref]/1:5,/4/2[chap01ref]/2[chap02ref]/1:10"
      const result = resolve(cfi, _document, { asRange: true })

      expect(result.isRange).toBe(true)
      expect(result.node instanceof Range).toBe(true)

      const range = result.node as Range
      expect(range.startContainer).toBe(_document.getElementById("chap01ref"))
      expect(range.startOffset).toBe(5)
      expect(range.endContainer).toBe(_document.getElementById("chap02ref"))
      expect(range.endOffset).toBe(10)
    })

    it("should handle temporal offsets", () => {
      const cfi = "/4/2[chap01ref]/1:5~10"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
      expect(result.offset).toBe(5)
      expect(result.temporal).toBe(10)
    })

    it("should handle spatial offsets", () => {
      const cfi = "/4/2[chap01ref]/1:5@10,20"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
      expect(result.offset).toBe(5)
      expect(result.spatial).toEqual([10, 20])
    })

    it("should handle side bias", () => {
      const cfi = "/4/2[chap01ref]/1:5[a]"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
      expect(result.offset).toBe(5)
      expect(result.side).toBe("a")
    })

    it("should handle indirection", () => {
      const cfi = "/4/2[chap01ref]/1:5,/4/2[chap01ref]/2[chap02ref]/1:10"
      const result = resolve(cfi, _document, { asRange: true })

      expect(result.isRange).toBe(true)
      expect(result.node instanceof Range).toBe(true)

      const range = result.node as Range
      expect(range.startContainer).toBe(_document.getElementById("chap01ref"))
      expect(range.startOffset).toBe(5)
      expect(range.endContainer).toBe(_document.getElementById("chap02ref"))
      expect(range.endOffset).toBe(10)
    })

    it("should return null for invalid CFIs", () => {
      const cfi = "/invalid/cfi"
      const result = resolve(cfi, _document)

      expect(result.node).toBeNull()
      expect(result.isRange).toBe(false)
    })

    it("should throw on error if throwOnError is true", () => {
      const cfi = "/invalid/cfi"

      expect(() => {
        resolve(cfi, _document, { throwOnError: true })
      }).toThrow()
    })
  })

  describe("resolveParsed", () => {
    it("should resolve a parsed CFI to a node", () => {
      const parsed = parse("/4/2[chap01ref]")
      const result = resolveParsed(parsed, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
    })

    it("should resolve a parsed CFI range", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
            <body>
                <div id="content">
                    <p id="chap01ref">This is paragraph 1</p>
                    <p id="chap02ref">This is paragraph 2</p>
                </div>
            </body>
        </html>`,
        "application/xhtml+xml",
      )
      const parsed = parse(
        "/4/2[chap01ref]/1:5,/4/2[chap01ref]/2[chap02ref]/1:10",
      )
      const result = resolveParsed(parsed, doc, { asRange: true })

      expect(result.isRange).toBe(true)
      expect(result.node instanceof Range).toBe(true)

      const range = result.node as Range
      expect(range.startContainer).toBe(doc.getElementById("chap01ref"))
      expect(range.startOffset).toBe(5)
      expect(range.endContainer).toBe(doc.getElementById("chap02ref"))
      expect(range.endOffset).toBe(10)
    })
  })
})
