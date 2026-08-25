import { describe, expect, it } from "vitest"
import {
  catalogIdentifierFromUrl,
  catalogIdentifierValue,
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

describe("catalogIdentifierValue", () => {
  it("reads an explicitly typed identifier", () => {
    expect(
      catalogIdentifierValue(
        [{ value: "k028AAAACAAJ", scheme: "GoogleBooks" }],
        "GoogleBooks",
      ),
    ).toBe("k028AAAACAAJ")
  })

  it("reads a reference URL the publication left untyped", () => {
    for (const scheme of ["URL", "Unknown", "uri"]) {
      expect(
        catalogIdentifierValue(
          [{ value: "https://books.google.com/books?id=k028AAAACAAJ", scheme }],
          "GoogleBooks",
        ),
      ).toBe("k028AAAACAAJ")
    }
  })

  it("canonicalizes what the publication authored", () => {
    expect(
      catalogIdentifierValue(
        [{ value: " 0002701 ", scheme: "ProjectGutenberg" }],
        "ProjectGutenberg",
      ),
    ).toBe("2701")
    expect(
      catalogIdentifierValue(
        [{ value: "OL7353617M", scheme: "OpenLibrary" }],
        "OpenLibrary",
      ),
    ).toBe("/books/OL7353617M")
    expect(
      catalogIdentifierValue(
        [{ value: "doi:10.1000/182", scheme: "DOI" }],
        "DOI",
      ),
    ).toBe("10.1000/182")
  })

  it("does not read one catalog's identifier as another's", () => {
    const identifiers = [
      { value: "https://www.gutenberg.org/ebooks/2701", scheme: "URL" },
    ]

    expect(catalogIdentifierValue(identifiers, "ProjectGutenberg")).toBe("2701")
    expect(catalogIdentifierValue(identifiers, "GoogleBooks")).toBeUndefined()
  })

  it("leaves an identifier another catalog already claims alone", () => {
    expect(
      catalogIdentifierValue(
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
      catalogIdentifierValue(
        [
          { value: "not-a-doi", scheme: "DOI" },
          { value: "https://doi.org/10.1000/182", scheme: "URL" },
        ],
        "DOI",
      ),
    ).toBe("10.1000/182")
  })

  it("answers for a scheme spelled loosely, as hand-built input can be", () => {
    expect(
      catalogIdentifierValue(
        [{ value: "k028AAAACAAJ", scheme: "googlebooks" }],
        "GoogleBooks",
      ),
    ).toBe("k028AAAACAAJ")
  })

  it("declines when nothing carries that catalog", () => {
    expect(
      catalogIdentifierValue(
        [{ value: "9780441013593", scheme: "ISBN" }],
        "GoogleBooks",
      ),
    ).toBeUndefined()
    expect(catalogIdentifierValue(undefined, "GoogleBooks")).toBeUndefined()
  })
})
