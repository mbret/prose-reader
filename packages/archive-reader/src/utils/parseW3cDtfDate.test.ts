import { describe, expect, it } from "vitest"
import { parseW3cDtfDate } from "./parseW3cDtfDate"

describe("parseW3cDtfDate", () => {
  it("returns undefined for undefined input", () => {
    expect(parseW3cDtfDate(undefined)).toBeUndefined()
  })

  it("returns undefined for non-date free text", () => {
    expect(parseW3cDtfDate("sometime in 2024")).toBeUndefined()
  })

  it("extracts only the year for a YYYY literal", () => {
    expect(parseW3cDtfDate("1997")).toEqual({ year: 1997 })
  })

  it("extracts year and month for a YYYY-MM literal", () => {
    expect(parseW3cDtfDate("1997-07")).toEqual({ year: 1997, month: 7 })
  })

  it("extracts year, month, and day for a YYYY-MM-DD literal", () => {
    expect(parseW3cDtfDate("1997-07-16")).toEqual({
      year: 1997,
      month: 7,
      day: 16,
    })
  })

  it("uses 1-based month numbering (January is 1)", () => {
    expect(parseW3cDtfDate("2011-01-01")).toEqual({
      year: 2011,
      month: 1,
      day: 1,
    })
  })

  it("ignores the time portion of a full W3CDTF timestamp", () => {
    expect(parseW3cDtfDate("2011-01-01T12:00:00Z")).toEqual({
      year: 2011,
      month: 1,
      day: 1,
    })
  })

  it("is timezone-independent (treats the literal as a calendar date)", () => {
    expect(parseW3cDtfDate("2011-01-01")).toEqual({
      year: 2011,
      month: 1,
      day: 1,
    })
  })

  it("trims surrounding whitespace before extracting components", () => {
    expect(parseW3cDtfDate("  2024-12-25  ")).toEqual({
      year: 2024,
      month: 12,
      day: 25,
    })
  })
})
