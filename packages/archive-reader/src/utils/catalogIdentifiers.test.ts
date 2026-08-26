import { describe, expect, it } from "vitest"
import {
  catalogIdentifierFromUrl,
  catalogUrlFromIdentifier,
  isMetadataCatalogScheme,
  METADATA_CATALOG_SCHEMES,
} from "./catalogIdentifiers.ts"

describe("catalogIdentifierFromUrl", () => {
  it("reads a Google Books volume from its site and API URLs", () => {
    expect(
      catalogIdentifierFromUrl(
        "https://books.google.com/books?id=k028AAAACAAJ",
      ),
    ).toEqual({ value: "k028AAAACAAJ", scheme: "GoogleBooks" })
    expect(
      catalogIdentifierFromUrl(
        "https://books.google.co.uk/books/about/Moby.html?id=k028AAAACAAJ&hl=en",
      ),
    ).toEqual({ value: "k028AAAACAAJ", scheme: "GoogleBooks" })
    expect(
      catalogIdentifierFromUrl(
        "https://www.googleapis.com/books/v1/volumes/k028AAAACAAJ",
      ),
    ).toEqual({ value: "k028AAAACAAJ", scheme: "GoogleBooks" })
  })

  it("reads a Project Gutenberg ebook from each of its URL shapes", () => {
    for (const url of [
      "https://www.gutenberg.org/ebooks/2701",
      "https://gutenberg.org/ebooks/2701.epub.images",
      "https://www.gutenberg.org/files/2701/2701-h/2701-h.htm",
      "https://www.gutenberg.org/cache/epub/2701/pg2701.txt",
    ]) {
      expect(catalogIdentifierFromUrl(url)).toEqual({
        value: "2701",
        scheme: "ProjectGutenberg",
      })
    }
  })

  it("reads an Open Library key, keeping the collection it belongs to", () => {
    expect(
      catalogIdentifierFromUrl("https://openlibrary.org/works/OL45883W"),
    ).toEqual({ value: "/works/OL45883W", scheme: "OpenLibrary" })
    expect(
      catalogIdentifierFromUrl(
        "https://openlibrary.org/books/OL7353617M/Moby_Dick",
      ),
    ).toEqual({ value: "/books/OL7353617M", scheme: "OpenLibrary" })
  })

  it("reads a DOI from its resolver URLs", () => {
    expect(catalogIdentifierFromUrl("https://doi.org/10.1000/182")).toEqual({
      value: "10.1000/182",
      scheme: "DOI",
    })
    expect(
      catalogIdentifierFromUrl("http://dx.doi.org/10.1038%2Fnphys1170"),
    ).toEqual({ value: "10.1038/nphys1170", scheme: "DOI" })
  })

  it("declines rather than throws on a malformed percent escape", () => {
    expect(
      catalogIdentifierFromUrl("https://doi.org/10.1000/%"),
    ).toBeUndefined()
    expect(
      catalogIdentifierFromUrl(
        "https://www.googleapis.com/books/v1/volumes/%E0",
      ),
    ).toBeUndefined()
  })

  it("declines a URL no known catalog addresses", () => {
    expect(
      catalogIdentifierFromUrl("https://example.com/books?id=k028AAAACAAJ"),
    ).toBeUndefined()
    expect(
      catalogIdentifierFromUrl("https://books.google.com/books?q=moby"),
    ).toBeUndefined()
    expect(catalogIdentifierFromUrl("not a url")).toBeUndefined()
    expect(
      catalogIdentifierFromUrl("ftp://books.google.com/books?id=k028AAAACAAJ"),
    ).toBeUndefined()
  })
})

describe("catalogUrlFromIdentifier", () => {
  it.each([
    [
      "GoogleBooks",
      "k028AAAACAAJ",
      "https://books.google.com/books?id=k028AAAACAAJ",
    ],
    ["ProjectGutenberg", "2701", "https://www.gutenberg.org/ebooks/2701"],
    [
      "OpenLibrary",
      "/works/OL45883W",
      "https://openlibrary.org/works/OL45883W",
    ],
    ["DOI", "10.1000/182", "https://doi.org/10.1000/182"],
  ])("builds the %s reference URL", (scheme, value, expected) => {
    expect(catalogUrlFromIdentifier({ scheme, value })).toBe(expected)
  })

  it("canonicalizes the value on the way out", () => {
    expect(
      catalogUrlFromIdentifier({
        scheme: "ProjectGutenberg",
        value: " 0002701 ",
      }),
    ).toBe("https://www.gutenberg.org/ebooks/2701")
    expect(
      catalogUrlFromIdentifier({ scheme: "OpenLibrary", value: "OL7353617M" }),
    ).toBe("https://openlibrary.org/books/OL7353617M")
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "doi:10.1000/182" }),
    ).toBe("https://doi.org/10.1000/182")
  })

  it("matches the scheme case-insensitively", () => {
    expect(
      catalogUrlFromIdentifier({
        scheme: "googlebooks",
        value: "k028AAAACAAJ",
      }),
    ).toBe("https://books.google.com/books?id=k028AAAACAAJ")
  })

  it("encodes a DOI suffix that reserves URL characters", () => {
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "10.1000/foo?bar" }),
    ).toBe("https://doi.org/10.1000/foo%3Fbar")
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "10.1000/foo%bar" }),
    ).toBe("https://doi.org/10.1000/foo%25bar")
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "10.1000/a#b" }),
    ).toBe("https://doi.org/10.1000/a%23b")
  })

  it("leaves the prefix separator literal, doi.org addressing by path", () => {
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "10.1000/182" }),
    ).toBe("https://doi.org/10.1000/182")
  })

  it("declines a value its catalog cannot address", () => {
    expect(
      catalogUrlFromIdentifier({
        scheme: "ProjectGutenberg",
        value: "not-a-number",
      }),
    ).toBeUndefined()
    expect(
      catalogUrlFromIdentifier({ scheme: "OpenLibrary", value: "not-a-key" }),
    ).toBeUndefined()
    expect(
      catalogUrlFromIdentifier({ scheme: "DOI", value: "just text" }),
    ).toBeUndefined()
    expect(
      catalogUrlFromIdentifier({ scheme: "GoogleBooks", value: "has spaces" }),
    ).toBeUndefined()
  })

  it("declines a scheme with no catalog behind it", () => {
    expect(
      catalogUrlFromIdentifier({ scheme: "ISBN", value: "9780441013593" }),
    ).toBeUndefined()
    expect(
      catalogUrlFromIdentifier({ scheme: "AcmeCatalog", value: "acme-42" }),
    ).toBeUndefined()
  })
})

describe("the two directions agree", () => {
  it.each([
    ["GoogleBooks", "k028AAAACAAJ"],
    ["ProjectGutenberg", "2701"],
    ["OpenLibrary", "/works/OL45883W"],
    ["OpenLibrary", "/books/OL7353617M"],
    ["DOI", "10.1000/182"],
    ["DOI", "10.1000/foo?bar"],
    ["DOI", "10.1038/nphys1170"],
  ])("round-trips a %s identifier through its URL", (scheme, value) => {
    const url = catalogUrlFromIdentifier({ scheme, value })

    expect(url).toBeDefined()
    expect(url && catalogIdentifierFromUrl(url)).toEqual({ scheme, value })
  })

  it("covers every catalog scheme in both directions", () => {
    expect([...METADATA_CATALOG_SCHEMES]).toEqual([
      "GoogleBooks",
      "ProjectGutenberg",
      "OpenLibrary",
      "DOI",
    ])

    for (const scheme of METADATA_CATALOG_SCHEMES) {
      expect(isMetadataCatalogScheme(scheme)).toBe(true)
    }

    expect(isMetadataCatalogScheme("ISBN")).toBe(false)
    expect(isMetadataCatalogScheme("AcmeCatalog")).toBe(false)
  })
})
