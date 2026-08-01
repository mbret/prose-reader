import type { ResolvedMetadata } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import { scoreMetadataCandidate } from "./scoreMetadataCandidate.ts"

const score = (query: ResolvedMetadata, candidate: ResolvedMetadata) =>
  scoreMetadataCandidate(query, candidate)

describe("scoreMetadataCandidate", () => {
  it("scores 0 when the two sides have nothing comparable", () => {
    expect(score({ title: "Dune" }, { publisher: "Ace" })).toEqual({
      score: 0,
      signals: [],
    })
  })

  it("only compares fields both sides state", () => {
    const { signals } = score(
      { title: "Dune", publisher: "Ace" },
      { title: "Dune", numberOfPages: 412 },
    )

    expect(signals.map((signal) => signal.field)).toEqual(["title"])
  })

  it("pins the score to 1 on an agreeing ISBN, whatever else disagrees", () => {
    const result = score(
      { isbn: "9780441013593", title: "Doon", publisher: "Somebody" },
      { isbn: "9780441013593", title: "Dune", publisher: "Ace" },
    )

    expect(result.score).toBe(1)
    expect(result.signals).toContainEqual(
      expect.objectContaining({ field: "isbn", score: 1 }),
    )
  })

  it("matches the ISBN-10 of a book against the ISBN-13 of a record", () => {
    expect(score({ isbn: "0441013597" }, { isbn: "9780441013593" }).score).toBe(
      1,
    )
  })

  it("rejects a candidate whose ISBN contradicts, however well the rest agrees", () => {
    // the wrong edition of the right book: same title, same author, different
    // ISBN. A weighted average would land at ~0.57 and be accepted.
    const result = score(
      {
        isbn: "9780441013593",
        title: "Dune",
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      },
      {
        isbn: "9780345391803",
        title: "Dune",
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
    expect(
      score({ isbn: "978-0-441-01359-3" }, { isbn: "9780441013593" }).score,
    ).toBe(1)
    expect(
      score({ isbn: "ISBN 0-441-01359-7" }, { isbn: "9780441013593" }).score,
    ).toBe(1)
  })

  it("recognizes an inverted author name", () => {
    const { signals } = score(
      {
        title: "Dune",
        contributors: [{ name: "Herbert, Frank", roles: ["author"] }],
      },
      {
        title: "Dune",
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      },
    )

    expect(signals).toContainEqual(
      expect.objectContaining({ field: "contributors", score: 1 }),
    )
  })

  it("reports what it compared, for display", () => {
    const { signals } = score(
      { title: "Dune" },
      { title: "Dune: Messiah", publisher: "Ace" },
    )

    expect(signals[0]).toMatchObject({
      field: "title",
      query: "Dune",
      candidate: "Dune: Messiah",
    })
  })

  it("tolerates a near publication year and a near page count", () => {
    const near = score(
      { published: { year: 1965 }, numberOfPages: 412 },
      { published: { year: 1966 }, numberOfPages: 400 },
    )
    const far = score(
      { published: { year: 1965 }, numberOfPages: 412 },
      { published: { year: 2011 }, numberOfPages: 90 },
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

  it("compares languages on their primary subtag", () => {
    const { signals } = score({ languages: ["en-US"] }, { languages: ["en"] })

    expect(signals).toContainEqual(
      expect.objectContaining({ field: "languages", score: 1 }),
    )
  })

  it("weight-averages the comparable fields", () => {
    const result = score(
      { title: "Dune", publisher: "Ace" },
      { title: "Dune", publisher: "Chilton Books" },
    )

    // a perfect title (weight .8) barely dented by a different publisher
    // (weight .15) — an edition detail must not sink a convincing match
    expect(result.score).toBeGreaterThan(0.8)
    expect(result.score).toBeLessThan(1)
  })
})
