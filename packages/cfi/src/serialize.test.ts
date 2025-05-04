import { describe, expect, it } from "vitest"
import { parse } from "./parse"
import { serialize } from "./serialize"

describe("EPUB CFI Serializer", () => {
  describe("serialize", () => {
    it("should serialize a simple CFI", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with character offset", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2:3)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with indirection", () => {
      const cfi = "epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/2:3)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with temporal offset", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg]~12.5)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with spatial offset", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg]@12.5:34.7)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with side bias", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2:3[;s=b])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with text assertion", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2[Hello World])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI range", () => {
      const cfi = "epubcfi(/4[body01]/10[para05],/2/1:1,/3:4)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with escaped characters", () => {
      const cfi = "epubcfi(/4[body^[01]/16[svg^]img])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with extensions", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05;vnd.foo=bar]/3:10[foobar;vnd.foo=bar])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with multiple extensions", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05];vnd.test.param1=value1;vnd.test.param2=value2)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with mixed extensions and side bias", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05]/2:3[;s=b;vnd.test.param=value])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with escaped characters in extensions", () => {
      const cfi =
        "epubcfi(/4[body01]/10[para05];vnd.test.param=value^,with^[special^]chars)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with multiple indirections", () => {
      const cfi = "epubcfi(/6/4[chap01ref]!/4[body01]!/10[para05]/2:3)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with multiple spatial coordinates", () => {
      const cfi = "epubcfi(/4[body01]/16[svgimg]@12.5:34.7:56.8)"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })

    it("should serialize a CFI with multiple text assertions", () => {
      const cfi = "epubcfi(/4[body01]/10[para05]/2:3[Hello,World])"
      const parsed = parse(cfi)
      expect(serialize(parsed)).toBe(cfi)
    })
  })
})
