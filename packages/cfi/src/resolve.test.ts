import { beforeEach, describe, expect, it } from "vitest"
import * as CFI from "./foliate"
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
      const cfi = "epubcfi(/4/2[chap01ref]/2[chap02ref])"
      const result = resolve(cfi, doc)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(doc.getElementById("chap02ref"))
      expect(CFI.toElement(doc, CFI.parse(cfi)[0])).toBe(
        doc.getElementById("chap02ref"),
      )
    })

    it("should handle temporal offsets", () => {
      const cfi = "/4/2[chap01ref]/1:5~10"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
      expect(result.offset).toBe(5)
      expect(result.temporal).toBe(10)
    })

    it("should handle side bias", () => {
      const cfi = "epubcfi(/4/2[chap01ref]/1:5[a])"
      const result = resolve(cfi, _document)

      expect(result.isRange).toBe(false)
      expect(result.node).toBe(_document.getElementById("chap01ref"))
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
    it("should handle text nodes according to CFI spec", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">First<em>Emphasized</em>Last</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )
      
      // Text before the em element
      const cfiToFirstTextNode = "epubcfi(/4[body01]/2[para01]/1:2)"
      const result1 = resolve(cfiToFirstTextNode, doc)
      expect(result1.node).toBeTruthy()
      
      // The node should be the first text node
      if (result1.node instanceof Node) {
        expect(result1.node.textContent).toContain("First")
        expect(result1.offset).toBe(2)
      }
      
      // Text after the em element
      const cfiToLastTextNode = "epubcfi(/4[body01]/2[para01]/5:2)"
      const result2 = resolve(cfiToLastTextNode, doc)
      expect(result2.node).toBeTruthy()
      
      // The node should be the last text node
      if (result2.node instanceof Node) {
        expect(result2.node.textContent).toContain("Last")
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
      
      // After last element (virtual position)
      const cfiAfterLast = "epubcfi(/4[body01]/4)"
      const result2 = resolve(cfiAfterLast, doc, { asRange: true })
      expect(result2.isRange).toBe(true)
    })
  })

//   describe("bidirectional conversion", () => {
//     it("should convert between DOM elements and CFIs", () => {
//       const parser = new DOMParser()
//       const doc = parser.parseFromString(
//         `<html xmlns="http://www.w3.org/1999/xhtml">
//           <body id="body01">
//             <div id="content">
//               <p id="para01">First paragraph</p>
//               <p id="para02">Second paragraph</p>
//               <p id="para03">Third paragraph</p>
//             </div>
//           </body>
//         </html>`,
//         "application/xhtml+xml",
//       )
      
//       const elements = [
//         doc.getElementById("para01"),
//         doc.getElementById("para02"),
//         doc.getElementById("para03")
//       ].filter(Boolean) as Element[]
      
//       if (elements.length === 3) {
//         const cfis = fromElements(elements)
//         expect(cfis.length).toBe(3)
        
//         // Test that the first CFI resolves back to the correct element
//         if (cfis[0]) {
//           const resolvedElement = resolve(cfis[0], doc).node
//           expect(resolvedElement).toBe(elements[0])
//         }
//       }
//     })
    
//     it("should convert between DOM ranges and CFIs", () => {
//       const parser = new DOMParser()
//       const doc = parser.parseFromString(
//         `<html xmlns="http://www.w3.org/1999/xhtml">
//           <body id="body01">
//             <p id="para01">Text in paragraph</p>
//           </body>
//         </html>`,
//         "application/xhtml+xml",
//       )
      
//       // Skip this test if the environment doesn't support Range creation
//       if (typeof doc.createRange !== 'function') {
//         return;
//       }
      
//       // Create a range in the document
//       const range = doc.createRange()
//       const para = doc.getElementById("para01")
//       if (para?.firstChild) {
//         const textNode = para.firstChild;
//         range.setStart(textNode, 2)
//         range.setEnd(textNode, 7)
        
//         // Convert range to CFI
//         const cfi = fromRange(range)
        
//         // Convert CFI back to range
//         const resolvedRange = toRange(doc, cfi)
        
//         expect(resolvedRange.startContainer).toBe(textNode)
//         expect(resolvedRange.startOffset).toBe(2)
//         expect(resolvedRange.endContainer).toBe(textNode)
//         expect(resolvedRange.endOffset).toBe(7)
//       }
//     })
//   })

//   describe("range CFIs", () => {
//     it("should resolve a range CFI directly to a range", () => {
//       const parser = new DOMParser()
//       const doc = parser.parseFromString(
//         `<html xmlns="http://www.w3.org/1999/xhtml">
//           <body id="body01">
//             <p id="para01">Text in paragraph</p>
//           </body>
//         </html>`,
//         "application/xhtml+xml",
//       )
      
//       // Skip this test if the environment doesn't support Range creation
//       if (typeof doc.createRange !== 'function') {
//         return;
//       }
      
//       // Create a range in the document
//       const range = doc.createRange()
//       const para = doc.getElementById("para01")
//       if (para?.firstChild) {
//         const textNode = para.firstChild;
//         range.setStart(textNode, 2)
//         range.setEnd(textNode, 7)
        
//         // Convert range to CFI
//         const cfi = fromRange(range)
        
//         // Now resolve the range CFI directly - it should return a range
//         const result = resolve(cfi, doc)
        
//         // The result should be a range
//         expect(result.isRange).toBe(true)
        
//         // Check that it's the expected range
//         if (result.node instanceof Range) {
//           expect(result.node.startContainer).toBe(textNode)
//           expect(result.node.startOffset).toBe(2)
//           expect(result.node.endContainer).toBe(textNode)
//           expect(result.node.endOffset).toBe(7)
//         }
//       }
//     })
//   })
})
