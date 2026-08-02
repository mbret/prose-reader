import { describe, expect, it } from "vitest"
import type { ProjectGutenbergRecord } from "./parse.ts"
import { resolveProjectGutenbergRecord } from "./resolve.ts"

const record: ProjectGutenbergRecord = {
  id: "78139",
  title: "Wilhelm Meister, vol. 2",
  publisher: "Project Gutenberg",
  issued: "2026-03-08",
  rights: "Public domain in the USA.",
  description: "Catalog note",
  summary: "Summary",
  languages: ["en", "en"],
  subjects: ["Bildungsromans"],
  bookshelves: ["German Literature", "Bildungsromans"],
  contributors: [
    { name: "Goethe, Johann Wolfgang von", role: "aut" },
    { name: "Carlyle, Thomas", role: "trl" },
    { name: "Carlyle, Thomas", role: "edt" },
  ],
  cover: { uri: "/cover.jpg", mediaType: "image/jpeg" },
}

describe("resolveProjectGutenbergRecord", () => {
  it("normalizes a record and preserves the exact matched URL", () => {
    expect(
      resolveProjectGutenbergRecord(record, {
        baseUrl: "https://www.gutenberg.org",
        matchedIdentifier: {
          value: "http://www.gutenberg.org/78139",
          scheme: "URL",
        },
      }),
    ).toEqual({
      title: "Wilhelm Meister, vol. 2",
      publisher: "Project Gutenberg",
      description: "Summary",
      rights: "Public domain in the USA.",
      languages: ["en"],
      subjects: ["Bildungsromans", "German Literature"],
      contributors: [
        { name: "Goethe, Johann Wolfgang von", roles: ["author"] },
        { name: "Carlyle, Thomas", roles: ["translator", "editor"] },
      ],
      published: { year: 2026, month: 3, day: 8 },
      identifiers: [
        { value: "http://www.gutenberg.org/78139", scheme: "URL" },
        { value: "78139", scheme: "ProjectGutenberg" },
      ],
      cover: {
        uri: "https://www.gutenberg.org/cover.jpg",
        mediaType: "image/jpeg",
        confidence: "derived",
      },
    })
  })

  it("does not duplicate an already canonical identifier", () => {
    expect(
      resolveProjectGutenbergRecord(record, {
        baseUrl: "https://www.gutenberg.org",
        matchedIdentifier: { value: "78139", scheme: "ProjectGutenberg" },
      }).identifiers,
    ).toEqual([{ value: "78139", scheme: "ProjectGutenberg" }])
  })

  it("drops invalid dates and non-HTTP cover URLs", () => {
    const metadata = resolveProjectGutenbergRecord(
      { ...record, issued: "2026-99-99", cover: { uri: "javascript:bad" } },
      {
        baseUrl: "https://www.gutenberg.org",
        matchedIdentifier: { value: "78139", scheme: "ProjectGutenberg" },
      },
    )

    expect(metadata.published).toBeUndefined()
    expect(metadata.cover).toBeUndefined()
  })
})
