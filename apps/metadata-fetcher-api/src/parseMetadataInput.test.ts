import { describe, expect, it } from "vitest"
import { parseMetadataInput } from "./parseMetadataInput.ts"

describe("parseMetadataInput", () => {
  it("returns undefined for anything that is not a JSON object", () => {
    expect(parseMetadataInput(undefined)).toBeUndefined()
    expect(parseMetadataInput("Dune")).toBeUndefined()
    expect(parseMetadataInput([{ title: "Dune" }])).toBeUndefined()
  })

  it("reads a bare resolved metadata", () => {
    expect(parseMetadataInput({ title: "Dune", numberOfPages: 412 })).toEqual({
      title: "Dune",
      numberOfPages: 412,
    })
  })

  it("unwraps the resolved archive shape", () => {
    expect(
      parseMetadataInput({
        version: 2,
        metadata: { title: "Dune" },
        unreadableSources: [],
      }),
    ).toEqual({ title: "Dune" })
  })

  it("drops fields whose type is not the announced one", () => {
    expect(
      parseMetadataInput({
        title: 42,
        publication: null,
        languages: "en",
        numberOfPages: "412",
        contributors: { name: "Frank Herbert" },
      }),
    ).toEqual({})
  })

  it("keeps the valid entries of a partly broken list", () => {
    expect(
      parseMetadataInput({
        languages: ["en", 42, "  ", "fr"],
        contributors: [
          { name: "Frank Herbert", roles: ["author"] },
          { name: 42 },
          "nope",
        ],
      }),
    ).toEqual({
      languages: ["en", "fr"],
      contributors: [{ name: "Frank Herbert", roles: ["author"] }],
    })
  })

  it("defaults a contributor with no usable roles to an empty role list", () => {
    expect(
      parseMetadataInput({ contributors: [{ name: "Frank Herbert" }] })
        ?.contributors,
    ).toEqual([{ name: "Frank Herbert", roles: [] }])
  })

  it("reads identifiers, their scheme, and the unique marker", () => {
    expect(
      parseMetadataInput({
        identifiers: [
          { value: "urn:uuid:1", unique: true },
          { value: "9780441013593", scheme: "ISBN" },
          { value: "not-unique", unique: "true" },
          { scheme: "ISBN" },
        ],
      })?.identifiers,
    ).toEqual([
      { value: "urn:uuid:1", unique: true },
      { value: "9780441013593", scheme: "ISBN" },
      { value: "not-unique" },
    ])
  })

  it("reads original and edition publication details", () => {
    expect(
      parseMetadataInput({
        publication: {
          original: { date: { year: 1965 }, publisher: "Chilton Books" },
          edition: { date: { year: 2005 }, imprint: "Ace" },
        },
      })?.publication,
    ).toEqual({
      original: { date: { year: 1965 }, publisher: "Chilton Books" },
      edition: { date: { year: 2005 }, imprint: "Ace" },
    })
    expect(
      parseMetadataInput({ publication: { original: {} } })?.publication,
    ).toBeUndefined()
    expect(
      parseMetadataInput({ publication: "1965" })?.publication,
    ).toBeUndefined()
  })

  it("reads series and collection membership", () => {
    expect(
      parseMetadataInput({
        belongsTo: {
          series: [{ name: "Dune", position: 1 }, { position: 2 }],
          collection: "nope",
        },
      })?.belongsTo,
    ).toEqual({ series: [{ name: "Dune", position: 1 }] })
  })

  it("ignores the parts of a resolved archive a lookup cannot search on", () => {
    expect(
      parseMetadataInput({
        title: "Dune",
        cover: { uri: "cover.jpg", confidence: "derived" },
        properties: [{ property: "calibre:series" }],
        comic: { manga: true },
      }),
    ).toEqual({ title: "Dune" })
  })
})
