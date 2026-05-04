import { describe, expect, it } from "vitest"
import { normalizeGtin } from "./normalizeGtin"

describe("normalizeGtin", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeGtin(undefined)).toBeUndefined()
    expect(normalizeGtin("")).toBeUndefined()
    expect(normalizeGtin("abc")).toBeUndefined()
  })

  it("accepts GTIN-13 with separators", () => {
    expect(normalizeGtin("978-3-16-148410-0")).toBe("9783161484100")
  })

  it("accepts GTIN-8", () => {
    expect(normalizeGtin("9638-5074")).toBe("96385074")
  })

  it("accepts GTIN-12", () => {
    expect(normalizeGtin("0-36180-592-125")).toBe("036180592125")
  })

  it("accepts GTIN-14", () => {
    expect(normalizeGtin("0 09714 000050 51")).toBe("00971400005051")
  })

  it("rejects digit counts outside GS1 GTIN lengths", () => {
    expect(normalizeGtin("123456789")).toBeUndefined()
    expect(normalizeGtin("12345678901")).toBeUndefined()
  })
})
