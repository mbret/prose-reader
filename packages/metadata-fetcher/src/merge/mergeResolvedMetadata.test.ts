import { describe, expect, it } from "vitest"
import { mergeResolvedMetadata } from "./mergeResolvedMetadata.ts"

describe("mergeResolvedMetadata", () => {
  it("returns an empty result when nothing is passed", () => {
    expect(mergeResolvedMetadata()).toEqual({})
    expect(mergeResolvedMetadata(undefined, undefined)).toEqual({})
  })

  it("lets the first entry stating a field own it", () => {
    expect(
      mergeResolvedMetadata(
        { title: "Book Title" },
        {
          title: "Catalog Title",
          publication: { edition: { publisher: "Ace" } },
        },
      ),
    ).toEqual({
      title: "Book Title",
      publication: { edition: { publisher: "Ace" } },
    })
  })

  it("merges field-wise, not object-wise", () => {
    const merged = mergeResolvedMetadata(
      { title: "Dune" },
      {
        cover: { uri: "https://example.com/cover.jpg", confidence: "derived" },
      },
    )

    expect(merged.title).toBe("Dune")
    expect(merged.cover?.uri).toBe("https://example.com/cover.jpg")
  })

  it("concatenates identifiers, deduped on scheme and value", () => {
    expect(
      mergeResolvedMetadata(
        { identifiers: [{ value: "urn:uuid:1", scheme: "UUID" }] },
        {
          identifiers: [
            { value: "URN:UUID:1", scheme: "uuid", unique: true },
            { value: "OL1W", scheme: "OpenLibrary" },
          ],
        },
      ).identifiers,
    ).toEqual([
      { value: "urn:uuid:1", scheme: "UUID", unique: true },
      { value: "OL1W", scheme: "OpenLibrary" },
    ])
  })

  it("merges belongsTo series and collection independently", () => {
    expect(
      mergeResolvedMetadata(
        { belongsTo: { series: [{ name: "Dune" }] } },
        { belongsTo: { collection: [{ name: "SF Masterworks" }] } },
      ).belongsTo,
    ).toEqual({
      series: [{ name: "Dune" }],
      collection: [{ name: "SF Masterworks" }],
    })
  })

  it("merges publication parts and their details independently", () => {
    expect(
      mergeResolvedMetadata(
        {
          publication: {
            original: { date: { year: 1965 } },
            edition: { publisher: "Ace" },
          },
        },
        {
          publication: {
            original: { publisher: "Chilton Books" },
            edition: { date: { year: 1990 }, imprint: "Spectra" },
          },
        },
      ).publication,
    ).toEqual({
      original: { date: { year: 1965 }, publisher: "Chilton Books" },
      edition: {
        date: { year: 1990 },
        publisher: "Ace",
        imprint: "Spectra",
      },
    })
  })

  it("keeps sparse results sparse", () => {
    expect(mergeResolvedMetadata({ title: "Dune" }, {})).toEqual({
      title: "Dune",
    })
  })
})
