import { describe, expect, it } from "vitest"
import { parse, parsedCfiToString } from "./parse"

describe("EPUB CFI Parser", () => {
  describe("parse", () => {
    it("should parse a simple CFI", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg])"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 16, id: "svgimg" },
        ],
      ])
    })

    it("should parse a CFI with character offset", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2:3)"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 10, id: "para05" },
          { index: 2, offset: 3 },
        ],
      ])
    })

    it("should parse a CFI with indirection", () => {
      const cfi = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/2:3)"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [{ index: 6 }, { index: 4, id: "chap01ref" }],
        [
          { index: 4, id: "body01" },
          { index: 10, id: "para05" },
          { index: 2, offset: 3 },
        ],
      ])
    })

    it("should parse a CFI with temporal offset", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg]~12.5)"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 16, id: "svgimg", temporal: 12.5 },
        ],
      ])
    })

    it("should parse a CFI with spatial offset", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg]@12.5:34.7)"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 16, id: "svgimg", spatial: [12.5, 34.7] },
        ],
      ])
    })

    it("should parse a CFI with side bias", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2:3[;s=b])"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 10, id: "para05" },
          { index: 2, offset: 3, side: "b" },
        ],
      ])
    })

    it("should parse a CFI with text assertion", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2[Hello World])"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 10, id: "para05" },
          { index: 2, text: ["Hello World"] },
        ],
      ])
    })

    it("should parse a CFI range", () => {
      const cfi = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
      const parsed = parse(cfi)

      expect(parsed).toEqual({
        parent: [
          [
            { index: 4, id: "body01" },
            { index: 10, id: "para05" },
          ],
        ],
        start: [[{ index: 2 }, { index: 1, offset: 1 }]],
        end: [[{ index: 3, offset: 4 }]],
      })
    })

    it("should parse a CFI with escaped characters", () => {
      const cfi = "epubcfi(/4[body^[01]/16[svg^]img])"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body[01" },
          { index: 16, id: "svg]img" },
        ],
      ])
    })
  })

  describe("toString", () => {
    it("should convert a parsed CFI back to a string", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg])"
      const parsed = parse(cfi)
      const result = parsedCfiToString(parsed)

      expect(result).toBe(cfi)
    })

    it("should convert a parsed CFI range back to a string", () => {
      const cfi = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
      const parsed = parse(cfi)
      const result = parsedCfiToString(parsed)

      expect(result).toBe(cfi)
    })
  })

  describe("extensions", () => {
    it("should parse a CFI with extension parameters", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05];vnd.test.param1=value1;vnd.test.param2=value2)"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          {
            index: 4,
            id: "body01",
          },
          {
            index: 10,
            id: "para05",
            extensions: {
              "vnd.test.param1": "value1",
              "vnd.test.param2": "value2",
            },
          },
        ],
      ])
    })

    it("should parse a CFI with mixed extensions and side bias", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05]/2:3[;s=b;vnd.test.param=value])"
      const parsed = parse(cfi)

      expect(parsed).toEqual([
        [
          { index: 4, id: "body01" },
          { index: 10, id: "para05" },
          {
            index: 2,
            offset: 3,
            side: "b",
            extensions: {
              "vnd.test.param": "value",
            },
          },
        ],
      ])
    })

    it("should convert parsed CFI with extensions back to a string", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05];vnd.test.param1=value1;vnd.test.param2=value2)"
      const parsed = parse(cfi)
      const result = parsedCfiToString(parsed)

      expect(result).toBe(cfi)
    })

    it("should handle escaped characters in extension parameters", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05];vnd.test.param=value^,with^[special^]chars)"
      const parsed = parse(cfi)

      if (Array.isArray(parsed) && parsed[0] && parsed[0][1]) {
        expect(parsed[0][1].extensions).toBeDefined()
        expect(parsed[0][1].extensions?.["vnd.test.param"]).toBe(
          "value,with[special]chars",
        )
      }

      const result = parsedCfiToString(parsed)
      expect(result).toBe(cfi)
    })
  })
})
