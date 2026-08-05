import { describe, expect, it } from "vitest"
import { generate } from "./generate"
import { resolve } from "./resolve"

describe("CFI Range handling", () => {
  it("should resolve a basic range CFI", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">First paragraph.</p>
            <p id="para02">Second paragraph.</p>
          </body>
        </html>`,
      "application/xhtml+xml",
    )

    // Basic range from start of para01 to start of para03
    const cfi = "epubcfi(/2[body01],/2[para01],/4[para02])"
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (!(result.node instanceof Range)) throw new Error("Not range")

    expect(result.node.startContainer).toBe(doc.getElementById("para01"))
    expect(result.node.endContainer).toBe(doc.getElementById("para02"))
  })

  it("should resolve a range CFI with character offsets", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <body id="body01">
          <p id="para01">First paragraph</p>
          <p id="para02">Second paragraph</p>
        </body>
      </html>`,
      "application/xhtml+xml",
    )

    // Range with character offsets - from 3rd char of para01 to 5th char of para02
    const cfi = "epubcfi(/4[body01],/2[para01]/1:3,/4[para02]/1:5)"
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      // Check that startContainer is the text node of para01
      const para01 = doc.getElementById("para01")
      expect(para01).not.toBeNull()
      expect(result.node.startContainer).toBe(para01?.firstChild)
      expect(result.node.startOffset).toBe(3)

      // Check that endContainer is the text node of para02
      const para02 = doc.getElementById("para02")
      expect(para02).not.toBeNull()
      expect(result.node.endContainer).toBe(para02?.firstChild)
      expect(result.node.endOffset).toBe(5)
    }
  })

  it("should resolve a range CFI within the same text node", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <body id="body01">
          <p id="para01">This is a test paragraph with longer text</p>
        </body>
      </html>`,
      "application/xhtml+xml",
    )

    // Range within the same text node - from char 5 to char 20
    const cfi = "epubcfi(/4[body01],/2[para01]/1:5,/2[para01]/1:20)"
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      const para01 = doc.getElementById("para01")
      expect(para01).not.toBeNull()

      // Both start and end should be in the same text node
      expect(result.node.startContainer).toBe(para01?.firstChild)
      expect(result.node.endContainer).toBe(para01?.firstChild)
      expect(result.node.startOffset).toBe(5)
      expect(result.node.endOffset).toBe(20)
    }
  })

  it("should handle range CFIs with different path components", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <body id="body01">
          <div id="div01">
            <p id="para01">First paragraph</p>
          </div>
          <div id="div02">
            <p id="para02">Second paragraph</p>
          </div>
        </body>
      </html>`,
      "application/xhtml+xml",
    )

    // Range with different path components
    const cfi = "epubcfi(/4[body01],/2[div01]/2[para01],/4[div02]/2[para02])"
    const result = resolve(cfi, doc, { asRange: true })

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      expect(result.node.startContainer).toBe(doc.getElementById("para01"))
      expect(result.node.endContainer).toBe(doc.getElementById("para02"))
    }
  })

  it("should resolve single-step start/end paths as children of the parent", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml"><body id="body01"><p id="para01">Hello <b>big</b> world</p></body></html>`,
      "application/xhtml+xml",
    )

    // Start/end paths are relative to the parent path: /1 and /3 are the two
    // text nodes of para01, not offsets on para01 itself.
    const cfi = "epubcfi(/2[body01]/2[para01],/1:2,/3:3)"
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      const para01 = doc.getElementById("para01")
      expect(result.node.startContainer).toBe(para01?.childNodes[0])
      expect(result.node.startOffset).toBe(2)
      expect(result.node.endContainer).toBe(para01?.childNodes[2])
      expect(result.node.endOffset).toBe(3)
      expect(result.node.toString()).toBe("llo big wo")
    }
  })

  it("should round-trip a generated range crossing an inline element", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml"><body id="body01"><p id="para01">abcdefghij<i>X</i>klmnopqrst</p></body></html>`,
      "application/xhtml+xml",
    )

    const para01 = doc.getElementById("para01")
    const startNode = para01?.childNodes[0]
    const endNode = para01?.childNodes[2]

    if (!startNode || !endNode) throw new Error("missing text nodes")

    const cfi = generate({
      start: { node: startNode, offset: 8 },
      end: { node: endNode, offset: 6 },
    })
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      expect(result.node.startContainer).toBe(startNode)
      expect(result.node.startOffset).toBe(8)
      expect(result.node.endContainer).toBe(endNode)
      expect(result.node.endOffset).toBe(6)
      expect(result.node.toString()).toBe("ijXklmnop")
    }
  })

  it("should resolve offset-only ranges attached to a text node parent", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml"><body id="body01"><p id="para01">0123456789</p></body></html>`,
      "application/xhtml+xml",
    )

    const cfi = "epubcfi(/2[body01]/2[para01]/1,:2,:5)"
    const result = resolve(cfi, doc)

    expect(result.isRange).toBe(true)
    expect(result.node).toBeInstanceOf(Range)

    if (result.node instanceof Range) {
      const textNode = doc.getElementById("para01")?.firstChild
      expect(result.node.startContainer).toBe(textNode)
      expect(result.node.startOffset).toBe(2)
      expect(result.node.endContainer).toBe(textNode)
      expect(result.node.endOffset).toBe(5)
      expect(result.node.toString()).toBe("234")
    }
  })

  it("should handle non-existent nodes in range CFIs", () => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(
      `<html xmlns="http://www.w3.org/1999/xhtml">
        <body id="body01">
          <p id="para01">First paragraph</p>
          <p id="para02">Second paragraph</p>
        </body>
      </html>`,
      "application/xhtml+xml",
    )

    // Range with non-existent end node
    const cfi = "epubcfi(/4[body01],/2[para01],/6[does-not-exist])"

    // Should not throw error, but return null
    const result = resolve(cfi, doc, { asRange: true })
    expect(result.node).toBeNull()

    // But should throw if throwOnError is true
    expect(() => {
      resolve(cfi, doc, { asRange: true, throwOnError: true })
    }).toThrow()
  })
})
