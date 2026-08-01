import { describe, expect, it } from "vitest"
import { mergeResolvedMetadata } from "./mergeResolvedMetadata"

describe("mergeResolvedMetadata", () => {
  it("returns an empty result when nothing is passed", () => {
    expect(mergeResolvedMetadata()).toEqual({})
    expect(mergeResolvedMetadata(undefined, undefined)).toEqual({})
  })

  it("lets the first entry stating a field own it", () => {
    expect(
      mergeResolvedMetadata(
        { title: "Book Title" },
        { title: "Catalog Title", publisher: "Ace" },
      ),
    ).toEqual({ title: "Book Title", publisher: "Ace" })
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
            { value: "URN:UUID:1", scheme: "uuid" },
            { value: "OL1W", scheme: "OpenLibrary" },
          ],
        },
      ).identifiers,
    ).toEqual([
      { value: "urn:uuid:1", scheme: "UUID" },
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

  it("keeps sparse results sparse", () => {
    expect(mergeResolvedMetadata({ title: "Dune" }, {})).toEqual({
      title: "Dune",
    })
  })
})
