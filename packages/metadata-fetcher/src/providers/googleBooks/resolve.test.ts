import { describe, expect, it } from "vitest"
import {
  parseGoogleBooksVolume,
  parseGoogleBooksVolumesResponse,
} from "./parse.ts"
import {
  GOOGLE_BOOKS_MAX_SUBJECTS,
  googleBooksCoverUrl,
  googleBooksVolumeUrl,
  resolveGoogleBooksVolume,
} from "./resolve.ts"

describe("Google Books parsing", () => {
  it("reads the useful fields from a volumes response", () => {
    expect(
      parseGoogleBooksVolumesResponse({
        totalItems: 1,
        items: [
          {
            id: "zyTCAlFPjgYC",
            volumeInfo: {
              title: "Dune",
              authors: ["Frank Herbert"],
              pageCount: 412,
              industryIdentifiers: [
                { type: "ISBN_13", identifier: "9780441013593" },
              ],
            },
          },
        ],
      }),
    ).toEqual([
      {
        id: "zyTCAlFPjgYC",
        volumeInfo: {
          title: "Dune",
          authors: ["Frank Herbert"],
          pageCount: 412,
          industryIdentifiers: [
            { type: "ISBN_13", identifier: "9780441013593" },
          ],
        },
      },
    ])
  })

  it("reads an unexpected payload as nothing found", () => {
    expect(parseGoogleBooksVolumesResponse(undefined)).toEqual([])
    expect(parseGoogleBooksVolumesResponse({ items: "nope" })).toEqual([])
    expect(parseGoogleBooksVolume({ volumeInfo: "nope" })).toBeUndefined()
  })

  it("drops malformed nested values instead of trusting third-party JSON", () => {
    expect(
      parseGoogleBooksVolume({
        id: 42,
        volumeInfo: {
          title: " Dune ",
          authors: ["Frank Herbert", null, "  "],
          pageCount: "412",
          industryIdentifiers: [
            { type: "ISBN_13", identifier: "9780441013593" },
            { type: "ISBN_10", identifier: null },
          ],
        },
      }),
    ).toEqual({
      volumeInfo: {
        title: "Dune",
        authors: ["Frank Herbert"],
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780441013593" }],
      },
    })
  })
})

describe("resolveGoogleBooksVolume", () => {
  it("normalizes a volume into the cross-format vocabulary", () => {
    expect(
      resolveGoogleBooksVolume({
        id: "zyTCAlFPjgYC",
        volumeInfo: {
          title: "Dune",
          subtitle: "A Novel",
          authors: ["Frank Herbert"],
          publisher: "Ace",
          publishedDate: "2005-08-02",
          description: "<p>A desert epic.</p>",
          industryIdentifiers: [
            { type: "ISBN_10", identifier: "0441013597" },
            { type: "ISBN_13", identifier: "9780441013593" },
          ],
          pageCount: 412,
          categories: ["Fiction", "Science fiction"],
          language: "en",
          imageLinks: {
            thumbnail:
              "http://books.google.com/books/content?id=zyTCAlFPjgYC&zoom=1&edge=curl",
          },
        },
      }),
    ).toEqual({
      title: "Dune: A Novel",
      description: "<p>A desert epic.</p>",
      publication: {
        edition: {
          date: { year: 2005, month: 8, day: 2 },
          publisher: "Ace",
        },
      },
      languages: ["en"],
      subjects: ["Fiction", "Science fiction"],
      contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      numberOfPages: 412,
      identifiers: [
        { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
        { value: "0441013597", scheme: "ISBN" },
        { value: "9780441013593", scheme: "ISBN" },
      ],
      cover: {
        uri: "https://books.google.com/books/content?id=zyTCAlFPjgYC&zoom=0",
        confidence: "derived",
      },
    })
  })

  it("echoes identifiers only after an exact lookup confirms them", () => {
    expect(
      resolveGoogleBooksVolume(
        { id: "zyTCAlFPjgYC", volumeInfo: { title: "Dune" } },
        {
          matchedIdentifier: {
            value: "https://books.google.com/books?id=zyTCAlFPjgYC",
            scheme: "URL",
          },
        },
      ).identifiers,
    ).toEqual([
      {
        value: "https://books.google.com/books?id=zyTCAlFPjgYC",
        scheme: "URL",
      },
      { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
    ])
  })

  it("uses the confirmed ISBN when Google omits industry identifiers", () => {
    expect(
      resolveGoogleBooksVolume(
        { id: "zyTCAlFPjgYC", volumeInfo: { title: "Dune" } },
        { matchedIsbn: "978-0-441-01359-3" },
      ),
    ).toMatchObject({
      identifiers: expect.arrayContaining([
        { value: "978-0-441-01359-3", scheme: "ISBN" },
      ]),
    })
  })

  it("appends Google's series display number only when the title lacks one", () => {
    expect(
      resolveGoogleBooksVolume({
        volumeInfo: {
          title: "Saga",
          seriesInfo: { bookDisplayNumber: "2" },
        },
      }).title,
    ).toBe("Saga Vol 2")
    expect(
      resolveGoogleBooksVolume({
        volumeInfo: {
          title: "Saga Vol. 2",
          seriesInfo: { bookDisplayNumber: "2" },
        },
      }).title,
    ).toBe("Saga Vol. 2")
  })

  it("prefers the largest cover and rejects non-HTTP URLs", () => {
    expect(
      googleBooksCoverUrl({
        thumbnail: "https://books.google.com/small?zoom=1",
        large: "http://books.google.com/large?zoom=2&edge=curl",
      }),
    ).toBe("https://books.google.com/large?zoom=0")
    expect(
      googleBooksCoverUrl({ large: "data:image/jpeg;base64,x" }),
    ).toBeUndefined()
    expect(
      googleBooksCoverUrl({
        large: "data:image/jpeg;base64,x",
        thumbnail: "http://books.google.com/small?zoom=1",
      }),
    ).toBe("https://books.google.com/small?zoom=0")
  })

  it("falls back through the candidate page links", () => {
    expect(
      googleBooksVolumeUrl({
        id: "zyTCAlFPjgYC",
        volumeInfo: {
          canonicalVolumeLink: "javascript:alert(1)",
          infoLink: "http://books.google.com/books?id=zyTCAlFPjgYC",
        },
      }),
    ).toBe("https://books.google.com/books?id=zyTCAlFPjgYC")
  })

  it("caps and deduplicates subjects", () => {
    const categories = Array.from(
      { length: GOOGLE_BOOKS_MAX_SUBJECTS + 10 },
      (_, index) => `subject ${index}`,
    )

    expect(
      resolveGoogleBooksVolume({
        volumeInfo: { categories: [categories[0] ?? "", ...categories] },
      }).subjects,
    ).toHaveLength(GOOGLE_BOOKS_MAX_SUBJECTS)
  })

  it("stays sparse for an empty volume", () => {
    expect(resolveGoogleBooksVolume({})).toEqual({})
  })
})
