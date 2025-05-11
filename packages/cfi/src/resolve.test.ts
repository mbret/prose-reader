import { beforeEach, describe, expect, it } from "vitest"
import { parse } from "./parse"
import { resolve } from "./resolve"

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
      const cfi = "epubcfi(/4/2[chap01ref])"
      const result = resolve(cfi, doc)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(doc.getElementById("chap01ref"))
    })

    it("should resolve a CFI with character offset", () => {
      const cfi = "epubcfi(/4/2[chap01ref]/1:5)"
      const result = resolve(cfi, _document)
      const chap01ref = _document.getElementById("chap01ref")

      expect(result.isRange).toBe(false)
      // According to the CFI spec, the result should be a text node within the element
      expect(chap01ref).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      expect(result.node).toBe(chap01ref!.childNodes[0])
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
      const cfi = "epubcfi(/4/2[chap01ref]/2[chap02ref])"
      const result = resolve(cfi, doc)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(doc.getElementById("chap02ref"))
    })

    it("should handle temporal offsets", () => {
      const cfi = "/4/2[chap01ref]/1:5~10"
      const result = resolve(cfi, _document)
      const chap01ref = _document.getElementById("chap01ref")

      expect(result.isRange).toBe(false)
      // According to the CFI spec, the result should be a text node within the element
      expect(chap01ref).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      expect(result.node).toBe(chap01ref!.childNodes[0])
      expect(result.offset).toBe(5)
      expect(result.temporal).toBe(10)
    })

    it.skip("should handle side bias", () => {
      const cfi = "epubcfi(/4/2[chap01ref]/1:5[a])"
      const result = resolve(cfi, _document)
      const chap01ref = _document.getElementById("chap01ref")

      expect(result.isRange).toBe(false)
      // According to the CFI spec, the result should be a text node within the element
      expect(chap01ref).not.toBeNull()
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      expect(result.node).toBe(chap01ref!.childNodes[0])
      expect(result.offset).toBe(5)
      expect(result.side).toBe("a")
    })

    it("should return null for invalid CFIs", () => {
      const cfi = "epubcfi(/invalid/cfi)"
      const result = resolve(cfi, _document)

      expect(result.node).toBeNull()
      expect(result.isRange).toBe(false)
    })

    it("should throw on error if throwOnError is true", () => {
      const cfi = "epubcfi(/invalid/cfi)"

      expect(() => {
        resolve(cfi, _document, { throwOnError: true })
      }).toThrow()
    })
  })

  describe("resolveParsed", () => {
    it("should resolve a parsed CFI to a node", () => {
      const parsed = parse("epubcfi(/4/2[chap01ref])")
      const result = resolve(parsed, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
    })
  })

  describe("text node handling", () => {
    it.skip("should handle text nodes according to CFI spec", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">First<em>Emphasized</em>Last</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      // First, create a paragraph with proper text content
      const newPara = doc.createElement("p")
      newPara.id = "para02"
      newPara.textContent = "First"
      doc.getElementById("body01")?.appendChild(newPara)

      // Text in the first paragraph - use para02 instead
      const cfiToFirstTextNode = "epubcfi(/4[body01]/4[para02]/1:2)"
      const result1 = resolve(cfiToFirstTextNode, doc)
      expect(result1.node).toBeTruthy()

      // Check that we get a text node with the correct content
      if (result1.node instanceof Node) {
        expect(result1.node.textContent).toBe("First")
        expect(result1.offset).toBe(2)
      }

      // Add another paragraph for the second test
      const lastPara = doc.createElement("p")
      lastPara.id = "para03"
      lastPara.textContent = "Last"
      doc.getElementById("body01")?.appendChild(lastPara)

      // Text in the second paragraph
      const cfiToLastTextNode = "epubcfi(/4[body01]/6[para03]/1:2)"
      const result2 = resolve(cfiToLastTextNode, doc)
      expect(result2.node).toBeTruthy()

      // Check that we get a text node with the correct content
      if (result2.node instanceof Node) {
        expect(result2.node.textContent).toBe("Last")
        expect(result2.offset).toBe(2)
      }
    })

    it("should handle virtual positions", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">Text in paragraph</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      // Before first element (virtual position)
      const cfiBeforeFirst = "epubcfi(/4[body01]/0)"
      const result1 = resolve(cfiBeforeFirst, doc, { asRange: true })
      expect(result1.isRange).toBe(true)
      expect(result1.node instanceof Range).toBe(true)

      // After last element (virtual position)
      const cfiAfterLast = "epubcfi(/4[body01]/4)"
      const result2 = resolve(cfiAfterLast, doc, { asRange: true })
      expect(result2.isRange).toBe(true)
      expect(result2.node instanceof Range).toBe(true)
    })
  })

  describe("extension parameters", () => {
    it("should pass through extension parameters to the result", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">Paragraph with extensions</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      // CFI with extension parameters
      const cfi =
        "epubcfi(/4[body01]/2[para01];vnd.test.timestamp=2023-05-01;vnd.test.user=test_user)"
      const result = resolve(cfi, doc)

      // Should include extensions in the result
      expect(result.extensions).toBeDefined()
      expect(result.extensions).toEqual({
        "vnd.test.timestamp": "2023-05-01",
        "vnd.test.user": "test_user",
      })

      // The node should still be correct
      expect(result.node).toBe(doc.getElementById("para01"))
    })
  })

  describe("indirection handling", () => {
    it("should handle indirection-only CFIs", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="cover">Cover page</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const cfi = "epubcfi(/6/2[cover]!)"
      const result = resolve(cfi, doc)

      expect(result.node).toBeNull()
      expect(result.isRange).toBe(false)
    })
  })
})
