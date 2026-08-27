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
    expect(inferIdentifierScheme("urn:uuid:abc")).toBe("Unknown")
    expect(inferIdentifierScheme("url:http://example.com/1")).toBe("Unknown")
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
