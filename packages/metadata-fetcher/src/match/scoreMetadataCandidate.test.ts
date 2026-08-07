import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import type { FetchMetadataInput } from "../types/fetchMetadataInput.ts"
import { scoreMetadataCandidate } from "./scoreMetadataCandidate.ts"

const score = (query: FetchMetadataInput, candidate: ResolvedMetadata) =>
  scoreMetadataCandidate(query, candidate)

describe("scoreMetadataCandidate", () => {
  it("scores 0 when the two sides have nothing comparable", () => {
    expect(
      score(
        { title: "Dune" },
        { publication: { edition: { publisher: "Ace" } } },
      ),
    ).toEqual({
      score: 0,
      signals: [],
    })
  })

  it("only compares fields both sides state", () => {
    const { signals } = score(
      { title: "Dune", publisher: "Ace" },
      { titles: [{ value: "Dune" }], numberOfPages: 412 },
    )

    expect(signals.map((signal) => signal.field)).toEqual(["title"])
  })

  it("pins the score to 1 on an agreeing ISBN, whatever else disagrees", () => {
    const result = score(
      {
        identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
        title: "Doon",
        publisher: "Somebody",
      },
      {
        identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
        titles: [{ value: "Dune" }],
        publication: { edition: { publisher: "Ace" } },
      },
    )

    expect(result.score).toBe(1)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "isbn", score: 1 }),
    )
  })

  it("matches the ISBN-10 of a book against the ISBN-13 of a record", () => {
    expect(
      score(
        { identifiers: [{ value: "0441013597", scheme: "ISBN" }] },
        { identifiers: [{ value: "9780441013593", scheme: "ISBN" }] },
      ).score,
    ).toBe(1)
  })

  it("rejects a candidate whose ISBN contradicts, however well the rest agrees", () => {
    // the wrong edition of the right book: same title, same author, different
    // ISBN. A weighted average would land at ~0.57 and be accepted.
    const result = score(
      {
        identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
        title: "Dune",
        authors: ["Frank Herbert"],
      },
      {
        identifiers: [{ value: "9780345391803", scheme: "ISBN" }],
        titles: [{ value: "Dune" }],
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      },
    )

    expect(result.score).toBe(0)
    // the evidence is still there for a consumer offering a manual pick
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "title", score: 1 }),
    )
  })

  it("matches ISBNs however they were typed", () => {
    const hyphenated = score(
      { identifiers: [{ value: "978-0-441-01359-3", scheme: "ISBN" }] },
      { identifiers: [{ value: "9780441013593", scheme: "ISBN" }] },
    )

    expect(hyphenated.score).toBe(1)
    expect(hyphenated.signals.map(({ field }) => field)).toEqual(["isbn"])
    expect(
      score(
        { identifiers: [{ value: "ISBN 0-441-01359-7", scheme: "ISBN" }] },
        { identifiers: [{ value: "9780441013593", scheme: "ISBN" }] },
      ).score,
    ).toBe(1)
  })

  it("recognizes an inverted author name", () => {
    const { signals } = score(
      {
        title: "Dune",
        authors: ["Herbert, Frank"],
      },
      {
        titles: [{ value: "Dune" }],
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      },
    )

    expect(signals).toContainEqual(
      expect.objectContaining({ field: "authors", score: 1 }),
    )
  })

  it("reports what it compared, for display", () => {
    const { signals } = score(
      { title: "Dune" },
      {
        titles: [{ value: "Dune: Messiah" }],
        publication: { edition: { publisher: "Ace" } },
      },
    )

    expect(signals[0]).toMatchObject({
      field: "title",
      query: "Dune",
      candidate: "Dune: Messiah",
    })
  })

  it("compares a book's joined title against a catalog's split one", () => {
    const candidate: ResolvedMetadata = {
      titles: [{ value: "Dune" }, { value: "A Novel", type: "subtitle" }],
    }
    const { signals } = score({ title: "Dune: A Novel" }, candidate)

    expect(signals[0]).toMatchObject({
      field: "title",
      score: 1,
      candidate: "Dune: A Novel",
    })
    // the comparison string is never written back onto the candidate
    expect(candidate.titles).toEqual([
      { value: "Dune" },
      { value: "A Novel", type: "subtitle" },
    ])
  })

  it("does not let the bare title launder a conflicting volume number", () => {
    // "Irina" alone agrees with the query, but the catalog says this record is
    // Vol. 1 and the query asks for Vol. 2 — the shorter form must not win.
    const result = score(
      { title: "Irina: The Vampire Cosmonaut Vol. 2" },
      {
        titles: [
          { value: "Irina" },
          {
            value: "The Vampire Cosmonaut (Light Novel) Vol. 1",
            type: "subtitle",
          },
        ],
      },
    )

    expect(result.signals[0]).toMatchObject({ field: "title", score: 0 })
    expect(result.score).toBe(0)
  })

  it("reads a stated volume number against the candidate's series position", () => {
    const wrongVolume = score(
      { title: "BLAME! Vol. 2" },
      {
        titles: [{ value: "BLAME!" }],
        belongsTo: {
          series: [
            {
              identifiers: [{ value: "z5f3Gg", scheme: "GoogleBooks" }],
              position: 1,
            },
          ],
        },
      },
    )
    const rightVolume = score(
      { title: "BLAME! Vol. 2" },
      {
        titles: [{ value: "BLAME!" }],
        belongsTo: { series: [{ position: 2 }] },
      },
    )

    expect(wrongVolume.signals[0]).toMatchObject({ field: "title", score: 0 })
    expect(rightVolume.signals[0]?.score).toBeGreaterThan(0.5)
  })

  it("leaves an unnumbered query alone whatever the series position", () => {
    expect(
      score(
        { title: "BLAME!" },
        {
          titles: [{ value: "BLAME!" }],
          belongsTo: { series: [{ position: 6 }] },
        },
      ).signals[0]?.score,
    ).toBe(1)
  })

  it("keeps the plain title when it compares better than the composed one", () => {
    const { signals } = score(
      { title: "Dune" },
      {
        titles: [
          { value: "Dune" },
          { value: "The Graphic Novel", type: "subtitle" },
        ],
      },
    )

    expect(signals[0]).toMatchObject({ score: 1, candidate: "Dune" })
  })

  it("tolerates a near publication year and a near page count", () => {
    const near = score(
      {
        publishedYear: 1965,
        numberOfPages: 412,
      },
      {
        publication: { original: { date: { year: 1966 } } },
        numberOfPages: 400,
      },
    )
    const far = score(
      {
        publishedYear: 1965,
        numberOfPages: 412,
      },
      {
        publication: { original: { date: { year: 2011 } } },
        numberOfPages: 90,
      },
    )

    expect(near.score).toBeGreaterThan(0.5)
    expect(far.score).toBe(0)
  })

  it("counts a shared identifier, and ignores same-value different-scheme ones", () => {
    const shared = score(
      { identifiers: [{ value: "OL45883W", scheme: "OpenLibrary" }] },
      { identifiers: [{ value: "ol45883w", scheme: "openlibrary" }] },
    )
    const clashing = score(
      { identifiers: [{ value: "12345", scheme: "DOI" }] },
      { identifiers: [{ value: "12345", scheme: "ISBN" }] },
    )

    expect(shared.score).toBe(1)
    expect(clashing.score).toBe(0)
  })

  it("makes a provider-confirmed shared identifier decisive", () => {
    const result = score(
      {
        title: "A locally edited title",
        identifiers: [
          { value: "http://www.gutenberg.org/78139", scheme: "URL" },
        ],
      },
      {
        titles: [{ value: "The catalog title" }],
        identifiers: [
          { value: "http://www.gutenberg.org/78139", scheme: "URL" },
          { value: "78139", scheme: "ProjectGutenberg" },
        ],
      },
    )

    expect(result.score).toBe(1)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "identifiers", score: 1 }),
    )
  })

  it("makes a matching Google Books volume id decisive", () => {
    const result = score(
      {
        title: "A local title",
        identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
      },
      {
        titles: [{ value: "The catalog title" }],
        identifiers: [{ value: "zytcalfpjgyc", scheme: "googlebooks" }],
      },
    )

    expect(result.score).toBe(1)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "identifiers", score: 1 }),
    )
  })

  it("does not make an Unknown identifier match decisive", () => {
    const result = score(
      {
        title: "Dune",
        identifiers: [{ value: "78139", scheme: "Unknown" }],
      },
      {
        titles: [{ value: "Neuromancer" }],
        identifiers: [{ value: "78139", scheme: "ProjectGutenberg" }],
      },
    )

    expect(result.score).toBeLessThan(1)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "identifiers", score: 1 }),
    )
  })

  it("does not treat disjoint provider identifier spaces as decisive contradictions", () => {
    const result = score(
      {
        title: "Dune",
        identifiers: [{ value: "one", scheme: "CatalogA" }],
      },
      {
        titles: [{ value: "Dune" }],
        identifiers: [{ value: "two", scheme: "CatalogB" }],
      },
    )

    expect(result.score).toBeGreaterThan(0.5)
  })

  it("compares languages on their primary subtag", () => {
    const { signals } = score({ languages: ["en-US"] }, { languages: ["en"] })

    expect(signals).toContainEqual(
      expect.objectContaining({ field: "languages", score: 1 }),
    )
  })

  it("weight-averages the comparable fields", () => {
    const result = score(
      { title: "Dune", publisher: "Ace" },
      {
        titles: [{ value: "Dune" }],
        publication: { edition: { publisher: "Chilton Books" } },
      },
    )

    // a perfect title (weight .8) barely dented by a different publisher
    // (weight .15) — an edition detail must not sink a convincing match
    expect(result.score).toBeGreaterThan(0.8)
    expect(result.score).toBeLessThan(1)
  })

  it("compares a published year with either candidate publication scope", () => {
    const result = score(
      {
        title: "Dune",
        publishedYear: 1965,
      },
      {
        titles: [{ value: "Dune" }],
        publication: { edition: { date: { year: 1965 } } },
      },
    )

    expect(result.signals.map((signal) => signal.field)).toEqual([
      "title",
      "publishedYear",
    ])
  })

  it("uses the best publication evidence from a rich candidate", () => {
    const result = score(
      { publisher: "Ace", publishedYear: 2005 },
      {
        publication: {
          original: { publisher: "Chilton Books", date: { year: 1965 } },
          edition: { publisher: "Ace", date: { year: 2005 } },
        },
      },
    )

    expect(result.signals).toEqual([
      expect.objectContaining({
        field: "publisher",
        score: 1,
        candidate: "Ace",
      }),
      expect.objectContaining({
        field: "publishedYear",
        score: 1,
        candidate: "2005",
      }),
    ])
  })

  it("rejects a fuzzy catalog hit that names a different volume", () => {
    const result = score(
      {
        title: "Wilhelm Meister's apprenticeship and travels, vol. 2 of 2",
        authors: ["Goethe, Johann Wolfgang von"],
        identifiers: [
          {
            value: "http://www.gutenberg.org/78139",
            scheme: "URL",
          },
        ],
        languages: ["en"],
        publishedYear: 2026,
        publisher: "Project Gutenberg",
      },
      {
        titles: [
          {
            value:
              "Wilhelm Meister's Apprenticeship and Travels, Vol. I (of 2)",
          },
        ],
        contributors: [
          { name: "Johann Wolfgang von Goethe", roles: ["author"] },
        ],
        identifiers: [{ value: "/works/OL40566043W", scheme: "OpenLibrary" }],
        languages: ["en"],
        publication: {
          original: { date: { year: 1821 } },
          edition: {
            date: { year: 2015 },
            publisher: "CreateSpace Independent Publishing Platform",
          },
        },
      },
    )

    expect(result.score).toBeLessThan(0.5)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "title", score: 0 }),
    )
  })
})
