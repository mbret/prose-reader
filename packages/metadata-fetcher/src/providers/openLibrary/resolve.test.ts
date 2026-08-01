import { describe, expect, it } from "vitest"
import { marcLanguageToBcp47 } from "./marcLanguage.ts"
import { parseOpenLibrarySearchResponse } from "./parse.ts"
import { OPEN_LIBRARY_MAX_SUBJECTS, resolveOpenLibraryDoc } from "./resolve.ts"

const coversBaseUrl = "https://covers.openlibrary.org"

describe("parseOpenLibrarySearchResponse", () => {
  it("reads the docs of a search payload", () => {
    expect(
      parseOpenLibrarySearchResponse({
        numFound: 1,
        docs: [
          {
            key: "/works/OL1W",
            title: "Dune",
            id_project_gutenberg: ["1342"],
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        key: "/works/OL1W",
        title: "Dune",
        id_project_gutenberg: ["1342"],
      }),
    ])
  })

  it("reads an unexpected payload as nothing found", () => {
    expect(parseOpenLibrarySearchResponse(undefined)).toEqual([])
    expect(parseOpenLibrarySearchResponse("nope")).toEqual([])
    expect(parseOpenLibrarySearchResponse({ docs: "nope" })).toEqual([])
  })

  it("drops fields whose type is not the announced one", () => {
    const [doc] = parseOpenLibrarySearchResponse({
      docs: [
        {
          title: 42,
          author_name: ["Frank Herbert", null, "  "],
          first_publish_year: "1965",
          cover_i: 8188413,
          id_project_gutenberg: ["1342", null, "  "],
        },
      ],
    })

    expect(doc).toEqual({
      author_name: ["Frank Herbert"],
      cover_i: 8188413,
      id_project_gutenberg: ["1342"],
    })
  })
})

describe("marcLanguageToBcp47", () => {
  it("maps both MARC variants of a language", () => {
    expect(marcLanguageToBcp47("fre")).toBe("fr")
    expect(marcLanguageToBcp47("fra")).toBe("fr")
    expect(marcLanguageToBcp47("ENG")).toBe("en")
  })

  it("passes unknown codes through rather than dropping them", () => {
    expect(marcLanguageToBcp47("tlh")).toBe("tlh")
  })

  it("drops the placeholders that name no language", () => {
    expect(marcLanguageToBcp47("und")).toBeUndefined()
    expect(marcLanguageToBcp47("mul")).toBeUndefined()
    expect(marcLanguageToBcp47("")).toBeUndefined()
  })
})

describe("resolveOpenLibraryDoc", () => {
  it("normalizes a doc into the cross-format vocabulary", () => {
    expect(
      resolveOpenLibraryDoc(
        {
          key: "/works/OL893415W",
          title: "Dune",
          author_name: ["Frank Herbert"],
          first_publish_year: 1965,
          publisher: ["Chilton Books", "Ace"],
          language: ["eng"],
          subject: ["Science fiction"],
          number_of_pages_median: 412,
          cover_i: 8188413,
          id_project_gutenberg: ["1965"],
        },
        { coversBaseUrl },
      ),
    ).toEqual({
      title: "Dune",
      contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      published: { year: 1965 },
      publisher: "Chilton Books",
      languages: ["en"],
      subjects: ["Science fiction"],
      numberOfPages: 412,
      cover: {
        uri: "https://covers.openlibrary.org/b/id/8188413-L.jpg",
        mediaType: "image/jpeg",
        confidence: "derived",
      },
      identifiers: [
        { value: "1965", scheme: "ProjectGutenberg" },
        { value: "/works/OL893415W", scheme: "OpenLibrary" },
      ],
    })
  })

  it("folds the subtitle into the title", () => {
    expect(
      resolveOpenLibraryDoc(
        { title: "Dune", subtitle: "a novel" },
        { coversBaseUrl },
      ).title,
    ).toBe("Dune: a novel")
  })

  it("states the ISBN only when the record was looked up by one", () => {
    expect(
      resolveOpenLibraryDoc({ title: "Dune" }, { coversBaseUrl }).isbn,
    ).toBeUndefined()
    expect(
      resolveOpenLibraryDoc(
        { title: "Dune" },
        { coversBaseUrl, isbn: "9780441013593" },
      ),
    ).toMatchObject({
      isbn: "9780441013593",
      identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
    })
  })

  it("echoes a Gutenberg URL only after an exact external-id lookup", () => {
    expect(
      resolveOpenLibraryDoc(
        { title: "Pride and Prejudice", id_project_gutenberg: ["1342"] },
        {
          coversBaseUrl,
          matchedProjectGutenbergIdentifier: {
            value: "http://www.gutenberg.org/1342",
            scheme: "URL",
          },
        },
      ).identifiers,
    ).toEqual([
      { value: "http://www.gutenberg.org/1342", scheme: "URL" },
      { value: "1342", scheme: "ProjectGutenberg" },
    ])
  })

  it("dedupes the languages the MARC variants collapse into", () => {
    expect(
      resolveOpenLibraryDoc({ language: ["fre", "fra"] }, { coversBaseUrl })
        .languages,
    ).toEqual(["fr"])
  })

  it("caps the subject list", () => {
    const subject = Array.from(
      { length: 200 },
      (_, index) => `subject ${index}`,
    )

    expect(
      resolveOpenLibraryDoc({ subject }, { coversBaseUrl }).subjects,
    ).toHaveLength(OPEN_LIBRARY_MAX_SUBJECTS)
  })

  it("stays sparse for an empty doc", () => {
    expect(resolveOpenLibraryDoc({}, { coversBaseUrl })).toEqual({})
  })
})
