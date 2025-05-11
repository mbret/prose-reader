import { describe, expect, it } from "vitest"
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

  // it("should handle range CFIs with extension parameters", () => {
  //   const parser = new DOMParser()
  //   const doc = parser.parseFromString(
  //     `<html xmlns="http://www.w3.org/1999/xhtml">
  //       <body id="body01">
  //         <p id="para01">First paragraph</p>
  //         <p id="para02">Second paragraph</p>
  //       </body>
  //     </html>`,
  //     "application/xhtml+xml",
  //   )

  //   // Range with extension parameters
  //   const cfi =
  //     "epubcfi(/4[body01];vnd.test.type=highlight,/2[para01],/4[para02])"
  //   const result = resolve(cfi, doc, { asRange: true })

  //   expect(result.isRange).toBe(true)
  //   expect(result.node).toBeInstanceOf(Range)
  //   expect(result.extensions).toBeDefined()
  //   expect(result.extensions).toEqual({
  //     "vnd.test.type": "highlight",
  //   })

  //   if (result.node instanceof Range) {
  //     expect(result.node.startContainer).toBe(doc.getElementById("para01"))
  //     expect(result.node.endContainer).toBe(doc.getElementById("para02"))
  //   }
  // })

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

  // it("should handle parsing errors in range CFIs", () => {
  //   const parser = new DOMParser()
  //   const doc = parser.parseFromString(
  //     `<html xmlns="http://www.w3.org/1999/xhtml">
  //       <body id="body01">
  //         <p id="para01">First paragraph</p>
  //         <p id="para02">Second paragraph</p>
  //       </body>
  //     </html>`,
  //     "application/xhtml+xml",
  //   )

  //   // Invalid range CFI (missing end part)
  //   const cfi = "epubcfi(/4[body01],/2[para01],)"
  //   const result = resolve(cfi, doc, { asRange: true })

  //   // This should not return a valid range
  //   expect(result.node).toBeNull()
  // })

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
