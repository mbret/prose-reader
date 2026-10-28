import { describe, expect, it } from "vitest"
import type { KnownMetadataIdentifierScheme } from "../types/resolvedMetadata"
import { inferIdentifierScheme } from "./inferIdentifierScheme"

describe("inferIdentifierScheme", () => {
  it("reads an absolute http(s) link as a URL", () => {
    expect(inferIdentifierScheme("https://example.com/book")).toBe("URL")
    expect(inferIdentifierScheme(" http://example.com ")).toBe("URL")
  })

  it("declines a link with no host, and other URI schemes", () => {
    expect(inferIdentifierScheme("https://")).toBe("Unknown")
    expect(inferIdentifierScheme("url:http://example.com/1")).toBe("Unknown")
  })

  it("reads a URN as the scheme its namespace names", () => {
    expect(
      inferIdentifierScheme("urn:uuid:A1B0D67E-2E81-4DF5-9E67-A64CBE366809"),
    ).toBe("UUID")
    expect(inferIdentifierScheme(" URN:UUID:abc ")).toBe("UUID")
    expect(inferIdentifierScheme("urn:isbn:123")).toBe("ISBN")
    expect(inferIdentifierScheme("urn:nbn:de:101:1-2011")).toBe("URN")
    expect(inferIdentifierScheme("urn:issn:1234-5678")).toBe("URN")
  })

  it("declines what RFC 8141 does not call a URN", () => {
    expect(inferIdentifierScheme("urn:")).toBe("Unknown")
    expect(inferIdentifierScheme("urn:uuid:")).toBe("Unknown")
    expect(inferIdentifierScheme("urn:x:catalog")).toBe("Unknown")
    expect(inferIdentifierScheme("urn:-uuid:abc")).toBe("Unknown")
  })

  it("reads a bare UUID as a UUID", () => {
    expect(inferIdentifierScheme("a1b0d67e-2e81-4df5-9e67-a64cbe366809")).toBe(
      "UUID",
    )
  })

  it("never reads a UUID's digit runs as an ISBN or a GTIN", () => {
    // `…-9f6132942570` holds the ten digits `6132942570`, an ISBN-10 by length,
    // and the other's digits alone are thirteen, a GTIN-13 by length
    for (const uuid of [
      "df2ff42a-d9c6-4bf0-b362-9f6132942570",
      "ca5bdfca-db4a-4ec6-8e49-111be5e9bd45",
    ]) {
      expect(inferIdentifierScheme(uuid)).toBe("UUID")
      expect(inferIdentifierScheme(`urn:uuid:${uuid}`)).toBe("UUID")
    }
  })

  it("reads a Bookland number as an ISBN, however it was written", () => {
    expect(inferIdentifierScheme("9783161484100")).toBe("ISBN")
    expect(inferIdentifierScheme("978-3-16-148410-0")).toBe("ISBN")
    expect(inferIdentifierScheme("urn:isbn:9783161484100")).toBe("ISBN")
  })

  it("reads another well-formed barcode as a GTIN", () => {
    expect(inferIdentifierScheme("4006381333931")).toBe("GTIN")
    expect(inferIdentifierScheme("036180592125")).toBe("GTIN")
  })

  it("declines anything else", () => {
    expect(inferIdentifierScheme("catalog-42")).toBe("Unknown")
    expect(inferIdentifierScheme("")).toBe("Unknown")
    expect(inferIdentifierScheme("   ")).toBe("Unknown")
  })
})

describe("InferredIdentifierScheme", () => {
  it("is assignable to the known scheme union", () => {
    const scheme: KnownMetadataIdentifierScheme =
      inferIdentifierScheme("9783161484100")

    expect(scheme).toBe("ISBN")
  })
})
