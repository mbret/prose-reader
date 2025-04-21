import { describe, expect, it } from "vitest"
import { collapse, compare } from "./compare"
import { parse } from "./parse"

describe("EPUB CFI Sorting", () => {
  describe("Rule 3: Steps earlier in sequence are more important", () => {
    it("should prioritize earlier steps", () => {
      const a = "epubcfi(/4/2[chap01ref])"
      const b = "epubcfi(/4/6[chap02ref])"

      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 4: Natural order for XML elements, character data, offsets", () => {
    it("should compare character offsets naturally", () => {
      const a = "epubcfi(/4[body01]/10[para05]/2:3)"
      const b = "epubcfi(/4[body01]/10[para05]/2:5)"

      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 5: Y position is more important than X", () => {
    it("should prioritize Y position over X position", () => {
      const a = "epubcfi(/4[body01]/16[svgimg]@10:20)" // x=10, y=20
      const b = "epubcfi(/4[body01]/16[svgimg]@50:10)" // x=50, y=10

      // b should come first because its Y is smaller
      expect(compare(a, b)).toBe(1)
      expect(compare(b, a)).toBe(-1)
    })

    it("should use X position when Y positions are equal", () => {
      const a = "epubcfi(/4[body01]/16[svgimg]@10:20)" // x=10, y=20
      const b = "epubcfi(/4[body01]/16[svgimg]@30:20)" // x=30, y=20

      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 6: Omitted spatial position precedes all others", () => {
    it("should prioritize absence of spatial position", () => {
      const a = "epubcfi(/4[body01]/16[svgimg])" // no spatial
      const b = "epubcfi(/4[body01]/16[svgimg]@10:20)" // with spatial

      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 7: Omitted temporal position precedes all others", () => {
    it("should prioritize absence of temporal position", () => {
      const a = "epubcfi(/4[body01]/16[svgimg])" // no temporal
      const b = "epubcfi(/4[body01]/16[svgimg]~5.2)" // with temporal

      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 8: Temporal position is more important than spatial", () => {
    it("should prioritize temporal over spatial", () => {
      const a = "epubcfi(/4[body01]/16[svgimg]~5.2)" // temporal only
      const b = "epubcfi(/4[body01]/16[svgimg]@10:20)" // spatial only

      expect(compare(a, b)).toBe(1)
      expect(compare(b, a)).toBe(-1)
    })

    it("should handle combined temporal and spatial", () => {
      const a = "epubcfi(/4[body01]/16[svgimg]~3.0@10:20)" // temporal 3.0
      const b = "epubcfi(/4[body01]/16[svgimg]~5.2@30:40)" // temporal 5.2

      // a comes before b because a's temporal value is smaller
      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })

  describe("Rule 9: Step types precedence", () => {
    it("should order step types correctly", () => {
      // Character offset (:) < Child (/) < Temporal-Spatial (~ or @) < Reference (!)
      const charOffset = "epubcfi(/4[body01]/10[para05]/2:3)"
      const child = "epubcfi(/4[body01]/10[para05]/2)"
      const temporal = "epubcfi(/4[body01]/10[para05]~5.0)"
      const spatial = "epubcfi(/4[body01]/10[para05]@10:20)"
      const reference = "epubcfi(/6/4[chap01ref]!)"

      // Character offset comes before child
      expect(compare(charOffset, child)).toBe(-1)
      expect(compare(child, charOffset)).toBe(1)

      // Child comes before temporal
      expect(compare(child, temporal)).toBe(-1)
      expect(compare(temporal, child)).toBe(1)

      // Child comes before spatial
      expect(compare(child, spatial)).toBe(-1)
      expect(compare(spatial, child)).toBe(1)

      // Temporal/spatial comes before reference
      expect(compare(temporal, reference)).toBe(-1)
      expect(compare(reference, temporal)).toBe(1)

      expect(compare(spatial, reference)).toBe(-1)
      expect(compare(reference, spatial)).toBe(1)
    })
  })

  describe("Complex comparisons", () => {
    it("should handle complex CFIs with multiple attributes", () => {
      // CFI with mixed attributes
      const a = "epubcfi(/4[body01]/10[para05]/2:3~2.5@10:15)"
      const b = "epubcfi(/4[body01]/10[para05]/2:3~3.0@10:15)"

      // b has higher temporal value
      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })

    it("should handle CFI ranges", () => {
      const a = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
      const b = "epubcfi(/4[body01]/10[para05],/2/1:2,/3:4)"

      // b's start position is later
      expect(compare(a, b)).toBe(-1)
      expect(compare(b, a)).toBe(1)
    })
  })
})

describe("collapse", () => {
  it("should collapse a CFI range to its start", () => {
    const cfi = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
    const parsed = parse(cfi)
    const collapsed = collapse(parsed)

    expect(collapsed).toEqual([
      [
        { index: 4, id: "body01" },
        { index: 10, id: "para05" },
      ],
      [{ index: 2 }, { index: 1, offset: 1 }],
    ])
  })

  it("should collapse a CFI range to its end", () => {
    const cfi = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
    const parsed = parse(cfi)
    const collapsed = collapse(parsed, true)

    expect(collapsed).toEqual([
      [
        { index: 4, id: "body01" },
        { index: 10, id: "para05" },
      ],
      [{ index: 3, offset: 4 }],
    ])
  })
})

describe("compare", () => {
  it("should compare two CFIs", () => {
    const a = "epubcfi(/4[body01]/10[para05]/2:3)"
    const b = "epubcfi(/4[body01]/10[para05]/2:5)"

    expect(compare(a, b)).toBe(-1)
    expect(compare(b, a)).toBe(1)
    expect(compare(a, a)).toBe(0)
  })

  it("should compare two CFI ranges", () => {
    const a = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
    const b = "epubcfi(/4[body01]/10[para05],/2/1:2,/3:4)"

    expect(compare(a, b)).toBe(-1)
    expect(compare(b, a)).toBe(1)
    expect(compare(a, a)).toBe(0)
  })
})
