import { describe, expect, it } from "vitest"
import { parseMetadataInput } from "./parseMetadataInput.ts"

describe("parseMetadataInput", () => {
  it("returns undefined for anything that is not a JSON object", () => {
    expect(parseMetadataInput(undefined)).toBeUndefined()
    expect(parseMetadataInput("Dune")).toBeUndefined()
    expect(parseMetadataInput([{ title: "Dune" }])).toBeUndefined()
  })

  it("reads the compact lookup input", () => {
    expect(
      parseMetadataInput({
        title: " Dune ",
        authors: ["Frank Herbert"],
        isbn: "9780441013593",
        gtin: "9780441013593",
        identifiers: [{ value: "OL893415W", scheme: "OpenLibrary" }],
        series: "Dune",
        publisher: "Ace",
        publishedYear: 2005,
        languages: ["en"],
        numberOfPages: 412,
      }),
    ).toEqual({
      title: "Dune",
      authors: ["Frank Herbert"],
      isbn: "9780441013593",
      gtin: "9780441013593",
      identifiers: [{ value: "OL893415W", scheme: "OpenLibrary" }],
      series: "Dune",
      publisher: "Ace",
      publishedYear: 2005,
      languages: ["en"],
      numberOfPages: 412,
    })
  })

  it("drops fields whose type is not the announced one", () => {
    expect(
      parseMetadataInput({
        title: 42,
        authors: "Frank Herbert",
        languages: "en",
        publishedYear: "1965",
        numberOfPages: "412",
      }),
    ).toEqual({})
  })

  it("keeps the valid entries of partly broken lists", () => {
    expect(
      parseMetadataInput({
        authors: ["Frank Herbert", 42, "  "],
        languages: ["en", 42, "  ", "fr"],
        identifiers: [
          { value: "urn:uuid:1", unique: true },
          { value: "9780441013593", scheme: "ISBN" },
          { scheme: "ISBN" },
          "nope",
        ],
      }),
    ).toEqual({
      authors: ["Frank Herbert"],
      languages: ["en", "fr"],
      identifiers: [
        { value: "urn:uuid:1" },
        { value: "9780441013593", scheme: "ISBN" },
      ],
    })
  })

  it("does not unwrap archive-reader entities", () => {
    expect(
      parseMetadataInput({
        version: 2,
        metadata: { title: "Dune" },
        unreadableSources: [],
      }),
    ).toEqual({})
  })

  it("ignores rich metadata fields with no input role", () => {
    expect(
      parseMetadataInput({
        title: "Dune",
        cover: { uri: "cover.jpg", confidence: "derived" },
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
        publication: { edition: { date: { year: 2005 } } },
        belongsTo: { series: [{ name: "Dune" }] },
        subjects: ["Science fiction"],
      }),
    ).toEqual({ title: "Dune" })
  })
})
