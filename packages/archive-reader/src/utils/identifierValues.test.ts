import { describe, expect, it } from "vitest"
import type { MetadataIdentifier } from "../types/resolvedMetadata.ts"
import {
  gtinIdentifierValue,
  isbnIdentifierValue,
  isIsbnBearingScheme,
} from "./identifierValues.ts"

describe("identifierValues", () => {
  it("normalizes ISBN and GTIN values from their typed identifiers", () => {
    expect(
      isbnIdentifierValue([
        { value: "urn:isbn:978-0-441-01359-3", scheme: "ISBN" },
      ]),
    ).toBe("9780441013593")
    expect(gtinIdentifierValue([{ value: "9638-5074", scheme: "GTIN" }])).toBe(
      "96385074",
    )
  })

  it("recognizes ISBN-shaped values carried by ComicInfo's GTIN scheme", () => {
    expect(
      isbnIdentifierValue([{ value: "978-0-441-01359-3", scheme: "GTIN" }]),
    ).toBe("9780441013593")
    expect(
      isbnIdentifierValue([{ value: "4006381333931", scheme: "GTIN" }]),
    ).toBeUndefined()
  })

  it("reports an ISBN-13 announced as an ISBN as the GTIN-13 it also is", () => {
    expect(
      gtinIdentifierValue([{ value: "978-0-441-01359-3", scheme: "ISBN" }]),
    ).toBe("9780441013593")
  })

  it("declines a non-book barcode even when the source announces it as an ISBN", () => {
    expect(
      isbnIdentifierValue([{ value: "4006381333931", scheme: "ISBN" }]),
    ).toBeUndefined()
  })

  it("skips identifiers that carry nothing usable and keeps looking", () => {
    expect(
      isbnIdentifierValue([
        { value: "urn:uuid:0d3f0b3a", scheme: "Unknown" },
        { value: "not-a-number", scheme: "ISBN" },
        { value: "0441013597", scheme: "GTIN" },
      ]),
    ).toBe("0441013597")
    expect(isbnIdentifierValue(undefined)).toBeUndefined()
    expect(gtinIdentifierValue([])).toBeUndefined()
  })

  it("accepts custom schemes without treating them as ISBN or GTIN", () => {
    const identifier: MetadataIdentifier = {
      value: "catalog-42",
      scheme: "ObokuCatalog",
    }

    expect(isbnIdentifierValue([identifier])).toBeUndefined()
    expect(gtinIdentifierValue([identifier])).toBeUndefined()
  })

  it("treats ISBN and GTIN as the one ISBN-bearing namespace", () => {
    expect(isIsbnBearingScheme("ISBN")).toBe(true)
    expect(isIsbnBearingScheme("GTIN")).toBe(true)
    expect(isIsbnBearingScheme("DOI")).toBe(false)
    expect(isIsbnBearingScheme("Unknown")).toBe(false)
    expect(isIsbnBearingScheme("ObokuCatalog")).toBe(false)
  })
})
