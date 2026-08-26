import { describe, expect, it } from "vitest"
import { normalizeIdentifierScheme } from "./normalizeIdentifierScheme.ts"

describe("normalizeIdentifierScheme", () => {
  it.each([
    ["isbn", "ISBN"],
    ["ISBN", "ISBN"],
    ["gtin", "GTIN"],
    ["doi", "DOI"],
    ["googlebooks", "GoogleBooks"],
    ["GOOGLEBOOKS", "GoogleBooks"],
    ["openlibrary", "OpenLibrary"],
    ["projectgutenberg", "ProjectGutenberg"],
    ["url", "URL"],
    ["unknown", "Unknown"],
  ])("spells %s the way the vocabulary does", (scheme, expected) => {
    expect(normalizeIdentifierScheme(scheme)).toBe(expected)
  })

  it("ignores surrounding whitespace, as authored metadata carries it", () => {
    expect(normalizeIdentifierScheme("  ISBN\n")).toBe("ISBN")
    expect(normalizeIdentifierScheme(" ExampleCatalog ")).toBe("ExampleCatalog")
  })

  it("leaves a custom scheme's spelling to the publication", () => {
    expect(normalizeIdentifierScheme("ExampleCatalog")).toBe("ExampleCatalog")
    expect(normalizeIdentifierScheme("examplecatalog")).toBe("examplecatalog")
    expect(normalizeIdentifierScheme("")).toBe("")
  })
})
