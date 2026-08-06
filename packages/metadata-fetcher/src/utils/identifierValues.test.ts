import type { MetadataIdentifier } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import { gtinIdentifierValue, isbnIdentifierValue } from "./identifierValues.ts"

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

  it("accepts custom schemes without treating them as ISBN or GTIN", () => {
    const identifier: MetadataIdentifier = {
      value: "catalog-42",
      scheme: "ObokuCatalog",
    }

    expect(isbnIdentifierValue([identifier])).toBeUndefined()
    expect(gtinIdentifierValue([identifier])).toBeUndefined()
  })
})
