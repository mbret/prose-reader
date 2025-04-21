import { generate } from "./generate"
import { describe, it, expect } from "vitest"
// @ts-ignore
import EpubCfiResolver from "epub-cfi-resolver"
import { fromElements } from "./foliate"
import { parse } from "./parse"

describe("CFI Generation", () => {
  describe("basic generation", () => {
    it("should generate a cfi for img tag", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <head>
              <title>…</title>
          </head>
      
              <body id="body01">
                  <p>…</p>
                  <p>…</p>
                  <p>…</p>
                  <p>…</p>
                  <p id="para05">xxx<em>yyy</em>0123456789</p>
                  <p>…</p>
                  <p>…</p>
                  <img id="svgimg" src="foo.svg" alt="…"/>
                  <p>…</p>
                  <p>…</p>
              </body>
          </html>`,
        "application/xhtml+xml",
      )

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const imageNode = doc.getElementById("svgimg")!

      // Test simple node format
      const cfi = generate(imageNode)

      // These variables are used for debugging and comparison
      // biome-ignore lint/correctness/noUnusedVariables: <explanation>
      const resolved = EpubCfiResolver.generate(imageNode)
      // biome-ignore lint/correctness/noUnusedVariables: <explanation>
      const foliate = fromElements([imageNode])

      // expect(resolved).toEqual("epubcfi(/4[body01]/16[svgimg])")
      expect(cfi).toEqual("epubcfi(/4[body01]/16[svgimg])")

      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const para05Node = doc.getElementById("para05")!
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      const para5NodeEm = para05Node.children[0]!

      // Test using CfiPosition format
      const cfi2 = generate({ node: para5NodeEm })
      expect(cfi2).toEqual("epubcfi(/4[body01]/10[para05]/2)")
    })
  })

  describe("text assertions", () => {
    it("should generate a CFI with text assertions for text nodes", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">This is some sample text for testing.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      // Get the text node from the paragraph
      const paraNode = doc.getElementById("para01")
      expect(paraNode).not.toBeNull()
      if (!paraNode) return

      const textNode = paraNode.firstChild
      expect(textNode).not.toBeNull()
      expect(textNode?.nodeType).toBe(Node.TEXT_NODE)
      if (!textNode) return

      // Generate CFI with text assertions - using CfiPosition format
      const cfi = generate(
        { node: textNode, offset: 5 },
        {
          includeTextAssertions: true,
        },
      )

      // The output should include a text assertion
      expect(cfi).toContain("[")
      expect(cfi).toContain("]")

      // Make sure it parses correctly
      const parsed = parse(cfi)
      expect(Array.isArray(parsed)).toBe(true)

      // Verify text node was properly captured
      if (Array.isArray(parsed) && parsed[0] && parsed[0].length > 0) {
        const lastPart = parsed[0][parsed[0].length - 1]
        if (lastPart) {
          expect(lastPart.text).toBeDefined()
        }
      }
    })

    it("should generate a robust CFI with longer text context", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">This is a longer paragraph with more context for robust CFIs.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const paraNode = doc.getElementById("para01")
      if (!paraNode) return

      const textNode = paraNode.firstChild
      if (!textNode) return

      // Use generateRobustCfi which uses more text context
      const cfi = generate(
        { node: textNode, offset: 10 },
        {
          includeTextAssertions: true,
          textAssertionLength: 15,
        },
      )

      // Should include text context (checking for actual pattern)
      expect(cfi).toContain("[")
      // The text will be centered around position 10, which is "a" in "is a longer"
      expect(cfi).toContain("is a longer")

      // Should be parseable
      const parsed = parse(cfi)
      expect(Array.isArray(parsed)).toBe(true)
    })

    it("should include side bias in the CFI", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">Text with a boundary here.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const paraNode = doc.getElementById("para01")
      if (!paraNode) return

      const textNode = paraNode.firstChild
      if (!textNode) return

      // Generate with 'before' side bias using CfiPosition format
      const cfi1 = generate(
        { node: textNode, offset: 15 },
        {
          includeSideBias: "before",
        },
      )

      // Should include side bias marker
      expect(cfi1).toContain(";s=b")

      // Generate with 'after' side bias and text assertions using CfiPosition format
      const cfi2 = generate(
        { node: textNode, offset: 15 },
        {
          includeTextAssertions: true,
          includeSideBias: "after",
        },
      )

      // Should include text and side bias
      expect(cfi2).toContain(";s=a")

      // Check correct format when both text assertion and side bias are present
      const parsed = parse(cfi2)
      expect(Array.isArray(parsed)).toBe(true)
      if (!Array.isArray(parsed)) return

      // The side param should be attached to the text assertion
      if (parsed[0]) {
        if (parsed[0].length > 0) {
          const lastPart = parsed[0][parsed[0].length - 1]
          if (lastPart) {
            expect(lastPart.side).toBe("a")
          }
        }
      }
    })
  })

  describe("temporal offset and spatial position", () => {
    it("should generate a CFI with temporal offset for a video element", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <video id="video01" src="sample.mp4"></video>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const videoNode = doc.getElementById("video01")
      expect(videoNode).not.toBeNull()
      if (!videoNode) return

      // Generate CFI with temporal offset (45.5 seconds)
      const cfi = generate({
        node: videoNode,
        temporal: 45.5,
      })

      // The output should include the temporal marker
      expect(cfi).toContain("~45.5")

      // Make sure it parses correctly
      const parsed = parse(cfi)
      expect(Array.isArray(parsed)).toBe(true)

      // Verify temporal offset was properly captured
      if (Array.isArray(parsed) && parsed[0] && parsed[0].length > 0) {
        const lastPart = parsed[0][parsed[0].length - 1]
        if (lastPart) {
          expect(lastPart.temporal).toBe(45.5)
        }
      }
    })

    it("should generate a CFI with spatial position for an image element", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <img id="img01" src="sample.jpg" alt="Sample Image" />
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const imgNode = doc.getElementById("img01")
      expect(imgNode).not.toBeNull()
      if (!imgNode) return

      // Generate CFI with spatial position (x:25, y:75)
      const cfi = generate({
        node: imgNode,
        spatial: [25, 75],
      })

      // The output should include the spatial marker
      expect(cfi).toContain("@25:75")

      // Make sure it parses correctly
      const parsed = parse(cfi)
      expect(Array.isArray(parsed)).toBe(true)

      // Verify spatial position was properly captured
      if (Array.isArray(parsed) && parsed[0] && parsed[0].length > 0) {
        const lastPart = parsed[0][parsed[0].length - 1]
        if (lastPart) {
          expect(lastPart.spatial).toEqual([25, 75])
        }
      }
    })

    it("should generate a CFI with both temporal and spatial positions", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <video id="video01" src="sample.mp4"></video>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const videoNode = doc.getElementById("video01")
      expect(videoNode).not.toBeNull()
      if (!videoNode) return

      // Generate CFI with both temporal (30 seconds) and spatial position (x:10, y:20)
      const cfi = generate({
        node: videoNode,
        temporal: 30,
        spatial: [10, 20],
      })

      // The output should include both markers
      expect(cfi).toContain("~30@10:20")

      // Make sure it parses correctly
      const parsed = parse(cfi)
      expect(Array.isArray(parsed)).toBe(true)

      // Verify both temporal and spatial values were properly captured
      if (Array.isArray(parsed) && parsed[0] && parsed[0].length > 0) {
        const lastPart = parsed[0][parsed[0].length - 1]
        if (lastPart) {
          expect(lastPart.temporal).toBe(30)
          expect(lastPart.spatial).toEqual([10, 20])
        }
      }
    })

    it("should handle temporal offset in a range CFI", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <video id="video01" src="sample.mp4"></video>
            <p id="para01">Caption text for the video.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const videoNode = doc.getElementById("video01")
      const paraNode = doc.getElementById("para01")
      expect(videoNode).not.toBeNull()
      expect(paraNode).not.toBeNull()
      if (!videoNode || !paraNode) return

      const textNode = paraNode.firstChild
      if (!textNode) return

      // Create a range from a point in the video to a point in the caption
      const rangeCfi = generate({
        start: {
          node: videoNode,
          temporal: 15.5,
        },
        end: {
          node: textNode,
          offset: 10,
        },
      })

      // The output should include the temporal marker
      expect(rangeCfi).toContain("~15.5")

      // Make sure it parses correctly
      const parsed = parse(rangeCfi)
      expect("parent" in parsed).toBe(true)

      // Verify temporal offset was properly captured in the range
      if ("parent" in parsed) {
        if (parsed.start?.[0] && parsed.start[0].length > 0) {
          const startParts = parsed.start[0]
          for (const part of startParts) {
            if (part.temporal) {
              expect(part.temporal).toBe(15.5)
              break
            }
          }
        }
      }
    })
  })

  describe("range CFIs", () => {
    it("should generate a range CFI between two points", () => {
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

      const para1 = doc.getElementById("para01")
      const para2 = doc.getElementById("para02")

      if (!para1 || !para2) return

      const textNode1 = para1.firstChild
      const textNode2 = para2.firstChild

      if (!textNode1 || !textNode2) return

      // Generate a range from the start of first paragraph to middle of second paragraph
      // using the unified range format
      const rangeCfi = generate({
        start: { node: textNode1, offset: 0 },
        end: { node: textNode2, offset: 8 },
      })

      // Should be in range format with commas
      expect(rangeCfi).toContain(",")
      expect(rangeCfi).toBe("epubcfi(/2[body01],/2[para01]/1:0,/4[para02]/1:8)")

      // Should be properly formatted
      const parsed = parse(rangeCfi)
      expect("parent" in parsed).toBe(true)

      // Should include the correct offsets
      if ("parent" in parsed) {
        if (parsed.start?.[0]) {
          const startParts = parsed.start[0]
          if (startParts.length > 0) {
            const lastStartPart = startParts[startParts.length - 1]
            if (lastStartPart) {
              expect(lastStartPart.offset).toBe(0)
            }
          }
        }

        if (parsed.end?.[0]) {
          const endParts = parsed.end[0]
          if (endParts.length > 0) {
            const lastEndPart = endParts[endParts.length - 1]
            if (lastEndPart) {
              expect(lastEndPart.offset).toBe(8)
            }
          }
        }
      }
    })

    it("should generate a range CFI with text assertions", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">First paragraph with some text.</p>
            <p id="para02">Second paragraph with different text.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const para1 = doc.getElementById("para01")
      const para2 = doc.getElementById("para02")

      if (!para1 || !para2) return

      const textNode1 = para1.firstChild
      const textNode2 = para2.firstChild

      if (!textNode1 || !textNode2) return

      // Generate a range with text assertions using the unified range format
      const rangeCfi = generate(
        {
          start: { node: textNode1, offset: 6 },
          end: { node: textNode2, offset: 10 },
        },
        {
          includeTextAssertions: true,
        },
      )

      // Should include text context from both paragraphs
      expect(rangeCfi).toContain("[")
      // "irst" is at position 6 in "First paragraph..."
      expect(rangeCfi).toContain("irst")
      // "d" is at position 10 in "Second paragraph..."
      expect(rangeCfi).toContain("d paragrap")

      // Should be properly formatted
      const parsed = parse(rangeCfi)
      expect("parent" in parsed).toBe(true)

      // Should include text assertions
      if ("parent" in parsed) {
        if (parsed.start?.[0]) {
          const startParts = parsed.start[0]
          if (startParts.length > 0) {
            const lastStartPart = startParts[startParts.length - 1]
            if (lastStartPart) {
              expect(lastStartPart.text).toBeDefined()
            }
          }
        }

        if (parsed.end?.[0]) {
          const endParts = parsed.end[0]
          if (endParts.length > 0) {
            const lastEndPart = endParts[endParts.length - 1]
            if (lastEndPart) {
              expect(lastEndPart.text).toBeDefined()
            }
          }
        }
      }
    })

    it("should generate a robust range CFI with text assertions using unified generate function", () => {
      const parser = new DOMParser()
      const doc = parser.parseFromString(
        `<html xmlns="http://www.w3.org/1999/xhtml">
          <body id="body01">
            <p id="para01">First paragraph with some text.</p>
            <p id="para02">Second paragraph with different text.</p>
          </body>
        </html>`,
        "application/xhtml+xml",
      )

      const para1 = doc.getElementById("para01")
      const para2 = doc.getElementById("para02")

      if (!para1 || !para2) return

      const textNode1 = para1.firstChild
      const textNode2 = para2.firstChild

      if (!textNode1 || !textNode2) return

      // Use the generateRobust helper for a range
      const robustRangeCfi = generate(
        {
          start: { node: textNode1, offset: 5 },
          end: { node: textNode2, offset: 12 },
        },
        {
          includeTextAssertions: true,
          textAssertionLength: 15,
        },
      )

      // Should include text assertions
      expect(robustRangeCfi).toContain("[")

      // Should be parseable
      const parsed = parse(robustRangeCfi)
      expect("parent" in parsed).toBe(true)

      // Skip further tests if the parsed result doesn't have the expected structure
      if (!("parent" in parsed)) return
      if (!parsed.start || !parsed.start[0]) return

      // Check text assertions in the start part
      const startParts = parsed.start[0]
      if (startParts?.length > 0) {
        const lastStartPart = startParts[startParts.length - 1]
        if (lastStartPart?.text?.[0]) {
          // Text length should be around 15 characters (the default for generateRobust)
          expect(lastStartPart.text[0].length).toBeGreaterThan(10)
        }
      }
    })
  })
})
