import { describe, expect, it } from "vitest"
import { buildMetadataQuery } from "./buildMetadataQuery"

describe("buildMetadataQuery", () => {
  it("carries the source metadata as the provider escape hatch", () => {
    const metadata = { title: "Dune", comic: { manga: true } }

    expect(buildMetadataQuery(metadata).metadata).toBe(metadata)
  })

  it("keeps only the authors when someone is credited as one", () => {
    const query = buildMetadataQuery({
      contributors: [
        { name: "Frank Herbert", roles: ["author"] },
        { name: "John Schoenherr", roles: ["coverArtist"] },
      ],
    })

    expect(query.authors).toEqual(["Frank Herbert"])
  })

  it("falls back to every contributor when none is credited as author", () => {
    const query = buildMetadataQuery({
      contributors: [
        { name: "Naoki Urasawa", roles: ["penciler"] },
        { name: "Takashi Nagasaki", roles: ["editor"] },
      ],
    })

    expect(query.authors).toEqual(["Naoki Urasawa", "Takashi Nagasaki"])
  })

  it("lifts the first series name", () => {
    const query = buildMetadataQuery({
      belongsTo: {
        series: [{ name: "Dune", position: 1 }, { name: "Chronicles" }],
      },
    })

    expect(query.series).toBe("Dune")
  })

  it("collapses blank and empty values to absent", () => {
    expect(
      buildMetadataQuery({
        title: "   ",
        languages: [],
        identifiers: [],
        published: {},
      }),
    ).toEqual({
      metadata: { title: "   ", languages: [], identifiers: [], published: {} },
    })
  })
})
