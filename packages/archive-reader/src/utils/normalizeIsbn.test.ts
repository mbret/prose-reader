import { describe, expect, it } from "vitest"
import { normalizeIsbn } from "./normalizeIsbn.ts"

describe("normalizeIsbn", () => {
  it("returns undefined for nothing to normalize", () => {
    expect(normalizeIsbn(undefined)).toBeUndefined()
    expect(normalizeIsbn(null)).toBeUndefined()
    expect(normalizeIsbn("")).toBeUndefined()
    expect(normalizeIsbn("urn:uuid:0d3f0b3a")).toBeUndefined()
  })

  it("keeps a 10- or 13-character value, dropping separators", () => {
    expect(normalizeIsbn("978-0-441-01359-3")).toBe("9780441013593")
    expect(normalizeIsbn("  0-441-01359-7 ")).toBe("0441013597")
    expect(normalizeIsbn("034539180x")).toBe("034539180X")
  })

  it("strips the urn:isbn: and isbn: prefixes", () => {
    expect(normalizeIsbn("urn:isbn:9780441013593")).toBe("9780441013593")
    expect(normalizeIsbn("ISBN: 9780441013593")).toBe("9780441013593")
    expect(normalizeIsbn("ISBN 0-441-01359-7")).toBe("0441013597")
  })

  it("finds the ISBN in free text around it", () => {
    expect(normalizeIsbn("Catalogue number 9783161484100, edition 2")).toBe(
      "9783161484100",
    )
    expect(normalizeIsbn("ref 12345678901 / isbn 9783161484100")).toBe(
      "9783161484100",
    )
  })

  it("never carves an ISBN out of a longer number", () => {
    // GTIN-12 and GTIN-14 retail barcodes: their leading ten digits are not an
    // ISBN-10, and a 978-prefixed GTIN-14 is not the ISBN-13 it starts with.
    expect(normalizeIsbn("036180592125")).toBeUndefined()
    expect(normalizeIsbn("00971400005051")).toBeUndefined()
    expect(normalizeIsbn("97800000000000")).toBeUndefined()
    expect(normalizeIsbn("12345678901")).toBeUndefined()
  })
})
