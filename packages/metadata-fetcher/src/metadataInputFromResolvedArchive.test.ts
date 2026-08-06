import type { ResolvedArchive } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import { metadataInputFromResolvedArchive } from "./metadataInputFromResolvedArchive.ts"

describe("metadataInputFromResolvedArchive", () => {
  it("projects only lookup and matching fields into the flat input", () => {
    const resolved: Pick<ResolvedArchive, "metadata"> = {
      metadata: {
        title: "Dune",
        cover: { uri: "cover.jpg", confidence: "derived" },
        description: "A desert planet.",
        contributors: [
          { name: "Frank Herbert", roles: ["author"] },
          { name: "John Schoenherr", roles: ["illustrator"] },
        ],
        identifiers: [
          { value: "urn:isbn:9780441013593", scheme: "URI", unique: true },
          { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
        ],
        belongsTo: {
          series: [
            { name: "Dune", position: 1 },
            { name: "Chronicles", position: 1 },
          ],
        },
        publication: {
          original: {
            date: { year: 1965 },
            publisher: "Chilton Books",
          },
          edition: { date: { year: 2005 }, publisher: "Ace" },
        },
        languages: ["en"],
        subjects: ["Science fiction"],
        numberOfPages: 412,
      },
    }

    expect(metadataInputFromResolvedArchive(resolved)).toEqual({
      title: "Dune",
      authors: ["Frank Herbert"],
      identifiers: [
        { value: "urn:isbn:9780441013593", scheme: "URI" },
        { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
      ],
      series: "Dune",
      publisher: "Ace",
      publishedYear: 2005,
      languages: ["en"],
      numberOfPages: 412,
    })
  })

  it("falls back to all contributors and original publication details", () => {
    expect(
      metadataInputFromResolvedArchive({
        metadata: {
          contributors: [{ name: "Jane Artist", roles: ["artist"] }],
          publication: {
            original: { date: { year: 1965 }, publisher: "Chilton Books" },
          },
        },
      }),
    ).toEqual({
      authors: ["Jane Artist"],
      publisher: "Chilton Books",
      publishedYear: 1965,
    })
  })
})
