import { describe, expect, it } from "vitest"
import { hasSearchTerms } from "./hasSearchTerms.ts"

describe("hasSearchTerms", () => {
  it("counts what identifies or names the book", () => {
    expect(hasSearchTerms({ title: "Dune" })).toBe(true)
    expect(
      hasSearchTerms({
        identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
      }),
    ).toBe(true)
    expect(
      hasSearchTerms({
        identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
      }),
    ).toBe(true)
    expect(
      hasSearchTerms({
        identifiers: [{ value: "urn:uuid:1", scheme: "Unknown" }],
      }),
    ).toBe(true)
    expect(
      hasSearchTerms({
        authors: ["Frank Herbert"],
      }),
    ).toBe(true)
    expect(hasSearchTerms({ series: "Dune" })).toBe(true)
  })

  it("does not count fields that only narrow a search", () => {
    expect(hasSearchTerms({})).toBe(false)
    expect(
      hasSearchTerms({
        publisher: "Ace",
        publishedYear: 1965,
        languages: ["en"],
        numberOfPages: 412,
      }),
    ).toBe(false)
  })

  it("treats blank and empty as absent", () => {
    expect(hasSearchTerms({ title: "   " })).toBe(false)
    expect(hasSearchTerms({ identifiers: [] })).toBe(false)
    expect(
      hasSearchTerms({ identifiers: [{ value: "  ", scheme: "Unknown" }] }),
    ).toBe(false)
    expect(hasSearchTerms({ authors: [] })).toBe(false)
    expect(hasSearchTerms({ authors: ["  "] })).toBe(false)
  })
})
