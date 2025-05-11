import { describe, expect, it } from "vitest"
import { generate } from "./generate"
import { parse } from "./parse"

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
