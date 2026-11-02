import { describe, expect, it } from "vitest"
import type { MetadataIdentifier } from "../types/resolvedMetadata.ts"
import { identifierValue, isIsbnBearingScheme } from "./identifierValues.ts"

describe("identifierValue for ISBN and GTIN", () => {
  it("normalizes values from their typed identifiers", () => {
    expect(
      identifierValue(
        [{ value: "urn:isbn:978-0-441-01359-3", scheme: "ISBN" }],
        "ISBN",
      ),
    ).toBe("9780441013593")
    expect(
      identifierValue([{ value: "9638-5074", scheme: "GTIN" }], "GTIN"),
    ).toBe("96385074")
  })

  it("recognizes ISBN-shaped values carried by ComicInfo's GTIN scheme", () => {
    expect(
      identifierValue([{ value: "978-0-441-01359-3", scheme: "GTIN" }], "ISBN"),
    ).toBe("9780441013593")
    expect(
      identifierValue([{ value: "4006381333931", scheme: "GTIN" }], "ISBN"),
    ).toBeUndefined()
  })

  it("reports an ISBN-13 announced as an ISBN as the GTIN-13 it also is", () => {
    expect(
      identifierValue([{ value: "978-0-441-01359-3", scheme: "ISBN" }], "GTIN"),
    ).toBe("9780441013593")
  })

  it("declines a non-book barcode even when the source announces it as an ISBN", () => {
    expect(
      identifierValue([{ value: "4006381333931", scheme: "ISBN" }], "ISBN"),
    ).toBeUndefined()
  })

  it("skips identifiers that carry nothing usable and keeps looking", () => {
    expect(
      identifierValue(
        [
          { value: "urn:uuid:0d3f0b3a", scheme: "Unknown" },
          { value: "not-a-number", scheme: "ISBN" },
          { value: "0441013597", scheme: "GTIN" },
        ],
        "ISBN",
      ),
    ).toBe("0441013597")
    expect(identifierValue(undefined, "ISBN")).toBeUndefined()
    expect(identifierValue([], "GTIN")).toBeUndefined()
  })

  it("accepts custom schemes without treating them as ISBN or GTIN", () => {
    const identifier: MetadataIdentifier = {
      value: "catalog-42",
      scheme: "ObokuCatalog",
    }

    expect(identifierValue([identifier], "ISBN")).toBeUndefined()
    expect(identifierValue([identifier], "GTIN")).toBeUndefined()
  })

  it("does not read a reference URL for a scheme that has no link form", () => {
    expect(
      identifierValue(
        [{ value: "https://books.google.com/books?id=k028", scheme: "URL" }],
        "ISBN",
      ),
    ).toBeUndefined()
  })

  it("treats ISBN and GTIN as the one ISBN-bearing namespace", () => {
    expect(isIsbnBearingScheme("ISBN")).toBe(true)
    expect(isIsbnBearingScheme("GTIN")).toBe(true)
    expect(isIsbnBearingScheme("isbn")).toBe(true)
    expect(isIsbnBearingScheme(" gtin ")).toBe(true)
    expect(isIsbnBearingScheme("DOI")).toBe(false)
    expect(isIsbnBearingScheme("Unknown")).toBe(false)
    expect(isIsbnBearingScheme("ObokuCatalog")).toBe(false)
  })
})

describe("identifierValue for catalog schemes", () => {
  it("reads an explicitly typed identifier", () => {
    expect(
      identifierValue(
        [{ value: "k028AAAACAAJ", scheme: "GoogleBooks" }],
        "GoogleBooks",
      ),
    ).toBe("k028AAAACAAJ")
  })

  it("reads a reference URL the publication left untyped", () => {
    for (const scheme of ["URL", "Unknown", "uri"]) {
      expect(
        identifierValue(
          [{ value: "https://books.google.com/books?id=k028AAAACAAJ", scheme }],
          "GoogleBooks",
        ),
      ).toBe("k028AAAACAAJ")
    }
  })

  it("canonicalizes what the publication authored", () => {
    expect(
      identifierValue(
        [{ value: " 0002701 ", scheme: "ProjectGutenberg" }],
        "ProjectGutenberg",
      ),
    ).toBe("2701")
    expect(
      identifierValue(
        [{ value: "OL7353617M", scheme: "OpenLibrary" }],
        "OpenLibrary",
      ),
    ).toBe("/books/OL7353617M")
    expect(
      identifierValue([{ value: "doi:10.1000/182", scheme: "DOI" }], "DOI"),
    ).toBe("10.1000/182")
  })

  it("does not read one catalog's identifier as another's", () => {
    const identifiers = [
      { value: "https://www.gutenberg.org/ebooks/2701", scheme: "URL" },
    ]

    expect(identifierValue(identifiers, "ProjectGutenberg")).toBe("2701")
    expect(identifierValue(identifiers, "GoogleBooks")).toBeUndefined()
  })

  it("leaves an identifier another catalog already claims alone", () => {
    expect(
      identifierValue(
        [
          {
            value: "https://books.google.com/books?id=k028AAAACAAJ",
            scheme: "OpenLibrary",
          },
        ],
        "GoogleBooks",
      ),
    ).toBeUndefined()
  })

  it("takes the first identifier that answers", () => {
    expect(
      identifierValue(
        [
          { value: "not-a-doi", scheme: "DOI" },
          { value: "https://doi.org/10.1000/182", scheme: "URL" },
        ],
        "DOI",
      ),
    ).toBe("10.1000/182")
  })

  it("reads a resolver URL an identifier states its own scheme for", () => {
    expect(
      identifierValue(
        [
          {
            value: "https://doi.org/10.1016/j.iheduc.2008.03.001",
            scheme: "DOI",
          },
        ],
        "DOI",
      ),
    ).toBe("10.1016/j.iheduc.2008.03.001")
    expect(
      identifierValue(
        [
          {
            value: "https://books.google.com/books?id=k028AAAACAAJ",
            scheme: "GoogleBooks",
          },
        ],
        "GoogleBooks",
      ),
    ).toBe("k028AAAACAAJ")
  })

  it("still refuses a bare id an untyped identifier happens to carry", () => {
    expect(
      identifierValue(
        [{ value: "k028AAAACAAJ", scheme: "Unknown" }],
        "GoogleBooks",
      ),
    ).toBeUndefined()
  })

  it("answers for a scheme spelled loosely, as hand-built input can be", () => {
    expect(
      identifierValue(
        [{ value: "k028AAAACAAJ", scheme: "googlebooks" }],
        "GoogleBooks",
      ),
    ).toBe("k028AAAACAAJ")
  })

  it("declines when nothing carries that catalog", () => {
    expect(
      identifierValue(
        [{ value: "9780441013593", scheme: "ISBN" }],
        "GoogleBooks",
      ),
    ).toBeUndefined()
    expect(identifierValue(undefined, "GoogleBooks")).toBeUndefined()
  })
})

describe("identifierValue for UUID", () => {
  const uuid = "a1b0d67e-2e81-4df5-9e67-a64cbe366809"

  it("reads a UUID identifier in either spelling and either case", () => {
    for (const value of [
      uuid,
      uuid.toUpperCase(),
      `urn:uuid:${uuid}`,
      `URN:UUID:${uuid.toUpperCase()}`,
    ]) {
      expect(identifierValue([{ value, scheme: "UUID" }], "UUID")).toBe(uuid)
    }
    expect(identifierValue([{ value: uuid, scheme: "uuid" }], "UUID")).toBe(
      uuid,
    )
  })

  it("reads the urn:uuid: form of a URN or an untyped identifier", () => {
    expect(
      identifierValue([{ value: `urn:uuid:${uuid}`, scheme: "URN" }], "UUID"),
    ).toBe(uuid)
    expect(
      identifierValue(
        [{ value: `urn:uuid:${uuid}`, scheme: "Unknown" }],
        "UUID",
      ),
    ).toBe(uuid)
  })

  it("still refuses a bare UUID an untyped identifier happens to carry", () => {
    expect(
      identifierValue([{ value: uuid, scheme: "Unknown" }], "UUID"),
    ).toBeUndefined()
  })

  it("declines what is not a UUID", () => {
    expect(
      identifierValue(
        [
          { value: "urn:uuid:abc", scheme: "UUID" },
          { value: "urn:nbn:de:101:1-2011", scheme: "URN" },
          { value: `{${uuid}}`, scheme: "UUID" },
          { value: `urn:uuid:${uuid}`, scheme: "ExampleCatalog" },
        ],
        "UUID",
      ),
    ).toBeUndefined()
  })
})
