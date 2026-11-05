import { mainTitle } from "@prose-reader/archive-reader"
import { describe, expect, it, vi } from "vitest"
import { fetchMetadata } from "./fetchMetadata.ts"
import { DEFAULT_METADATA_MATCH_MIN_SCORE } from "./match/scoreMetadataCandidate.ts"
import { MetadataProviderResponseError } from "./providers/responseError.ts"
import { FETCHED_METADATA_VERSION } from "./types/fetchedMetadata.ts"
import type { FetchMetadataInput } from "./types/fetchMetadataInput.ts"
import type { MetadataCandidate, MetadataProvider } from "./types/provider.ts"

const providerReturning = (
  id: string,
  candidates: ReadonlyArray<MetadataCandidate>,
): MetadataProvider => ({
  id,
  name: `${id} catalog`,
  search: () => Promise.resolve(candidates),
})

const failingProvider = (id: string, error = new Error("boom")) => ({
  id,
  name: `${id} catalog`,
  search: () => Promise.reject(error),
})

const book: FetchMetadataInput = {
  title: "Dune",
  authors: ["Frank Herbert"],
}

describe("fetchMetadata", () => {
  it("accepts the compact lookup input", async () => {
    const providers = [
      providerReturning("a", [
        {
          metadata: {
            titles: [{ value: "Dune" }],
            publication: { edition: { publisher: "Ace" } },
          },
        },
      ]),
    ]
    const fetched = await fetchMetadata(book, { providers })

    expect(fetched.matches[0]?.metadata).toEqual({
      titles: [{ value: "Dune" }],
      publication: { edition: { publisher: "Ace" } },
    })
  })

  it("hands every provider the metadata itself, verbatim", async () => {
    const search = vi.fn().mockResolvedValue([])

    await fetchMetadata(book, {
      providers: [{ id: "a", name: "A", search }],
      limit: 3,
    })

    expect(search).toHaveBeenCalledWith(
      book,
      expect.objectContaining({ limit: 3 }),
    )
  })

  it("ranks matches across providers, best first", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("weak", [
          { metadata: { titles: [{ value: "Duna" }] } },
        ]),
        providerReturning("strong", [
          { metadata: { titles: [{ value: "Dune" }] } },
        ]),
      ],
    })

    expect(fetched.matches.map((match) => match.providerId)).toEqual([
      "strong",
      "weak",
    ])
    expect(fetched.matches[0]?.score).toBe(1)
  })

  it("breaks ties in the order the providers were declared", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("first", [
          { metadata: { titles: [{ value: "Dune" }] } },
        ]),
        providerReturning("second", [
          { metadata: { titles: [{ value: "Dune" }] } },
        ]),
      ],
    })

    expect(fetched.matches.map((match) => match.providerId)).toEqual([
      "first",
      "second",
    ])
  })

  it("marks matches on either side of the acceptance threshold", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("weak", [
          {
            metadata: {
              titles: [{ value: "Something Else" }],
              publication: { edition: { publisher: "Wrong" } },
            },
          },
        ]),
        providerReturning("strong", [
          { metadata: { titles: [{ value: "Dune" }], numberOfPages: 412 } },
        ]),
      ],
    })

    expect(
      fetched.matches.map(({ providerId, accepted }) => ({
        providerId,
        accepted,
      })),
    ).toEqual([
      { providerId: "strong", accepted: true },
      { providerId: "weak", accepted: false },
    ])
  })

  it("keeps the rejected matches, ranked, for manual confirmation", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { titles: [{ value: "Neuromancer" }] } },
        ]),
      ],
    })

    expect(fetched.matches).toHaveLength(1)
    expect(fetched.matches[0]?.accepted).toBe(false)
    expect(fetched.sources.a?.matches[0]?.signals).toContainEqual(
      expect.objectContaining({ field: "title" }),
    )
  })

  it("honors minScore", async () => {
    const providers = [
      providerReturning("a", [
        { metadata: { titles: [{ value: "Dune Messiah" }] } },
      ]),
    ]

    expect(
      (await fetchMetadata(book, { providers, minScore: 1 })).matches[0]
        ?.accepted,
    ).toBe(false)
    expect(
      (await fetchMetadata(book, { providers, minScore: 0.1 })).matches[0]
        ?.accepted,
    ).toBe(true)
  })

  it("accepts by DEFAULT_METADATA_MATCH_MIN_SCORE when given no minScore", async () => {
    const providers = [
      providerReturning("a", [
        { metadata: { titles: [{ value: "Dune" }] } },
        { metadata: { titles: [{ value: "Dune Messiah" }] } },
        { metadata: { titles: [{ value: "Neuromancer" }] } },
      ]),
    ]

    const { matches } = await fetchMetadata(book, { providers })

    expect(matches.map(({ accepted }) => accepted)).toEqual([
      true,
      false,
      false,
    ])
    for (const match of matches) {
      expect(match.accepted).toBe(
        match.score >= DEFAULT_METADATA_MATCH_MIN_SCORE,
      )
    }
  })

  it("caps the matches a provider contributes, best first", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { titles: [{ value: "Neuromancer" }] } },
          { metadata: { titles: [{ value: "Dune" }] } },
          { metadata: { titles: [{ value: "Duna" }] } },
        ]),
      ],
      limit: 2,
    })

    expect(
      fetched.sources.a?.matches.map((match) => mainTitle(match.metadata)),
    ).toEqual(["Dune", "Duna"])
  })

  it("reports the identity of every provider that answered", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [providerReturning("a", [])],
    })

    expect(fetched.sources).toEqual({
      a: { provider: { id: "a", name: "a catalog" }, matches: [] },
    })
  })

  it("reports the status when a catalog answered with one", async () => {
    const rateLimited: MetadataProvider = {
      id: "throttled",
      name: "Throttled Catalog",
      search: () =>
        Promise.reject(new MetadataProviderResponseError(429, "slow down")),
    }
    // another HTTP client's error, carrying the status structurally
    const foreign: MetadataProvider = {
      id: "foreign",
      name: "Foreign Client",
      search: () =>
        Promise.reject(
          Object.assign(new Error("Service Unavailable"), { status: 503 }),
        ),
    }

    const fetched = await fetchMetadata(book, {
      providers: [rateLimited, foreign, failingProvider("network")],
    })

    expect(fetched.failedProviders).toEqual([
      { id: "throttled", status: 429 },
      { id: "foreign", status: 503 },
      { id: "network" },
    ])
  })

  it("survives a failing provider and lists it", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        failingProvider("down"),
        providerReturning("up", [
          { metadata: { titles: [{ value: "Dune" }] } },
        ]),
      ],
    })

    expect(fetched.failedProviders).toEqual([{ id: "down" }])
    expect(fetched.sources).not.toHaveProperty("down")
    expect(fetched.matches[0]?.metadata).toEqual({
      titles: [{ value: "Dune" }],
    })
  })

  it("rejects when the caller aborts", async () => {
    const controller = new AbortController()

    controller.abort()

    await expect(
      fetchMetadata(book, {
        providers: [failingProvider("a", new Error("aborted"))],
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted")
  })

  it("keeps the provider payload only when asked", async () => {
    const providers = [
      providerReturning("a", [
        { metadata: { titles: [{ value: "Dune" }] }, raw: { id: 1 } },
      ]),
    ]

    expect(
      (await fetchMetadata(book, { providers })).matches[0],
    ).not.toHaveProperty("raw")
    expect(
      (await fetchMetadata(book, { providers, includeRaw: true })).matches[0]
        ?.raw,
    ).toEqual({ id: 1 })
  })

  it("fetches details only for accepted matches", async () => {
    const accepted = vi.fn().mockResolvedValue({
      titles: [{ value: "Dune" }],
      cover: { uri: "https://example.com/dune.jpg" },
    })
    const rejected = vi.fn().mockResolvedValue({
      titles: [{ value: "Neuromancer" }],
      cover: { uri: "https://example.com/neuromancer.jpg" },
    })
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { titles: [{ value: "Dune" }] }, fetchDetails: accepted },
          {
            metadata: { titles: [{ value: "Neuromancer" }] },
            fetchDetails: rejected,
          },
        ]),
      ],
    })

    expect(accepted).toHaveBeenCalledTimes(1)
    expect(rejected).not.toHaveBeenCalled()
    expect(fetched.matches.map(({ metadata }) => metadata.cover)).toEqual([
      { uri: "https://example.com/dune.jpg" },
      undefined,
    ])
  })

  it("fetches details for the best accepted match only", async () => {
    const best = vi.fn().mockResolvedValue({ titles: [{ value: "Dune" }] })
    const other = vi.fn().mockResolvedValue({ titles: [{ value: "Dune" }] })

    await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { titles: [{ value: "Dune" }] }, fetchDetails: best },
          { metadata: { titles: [{ value: "Dune" }] }, fetchDetails: other },
        ]),
      ],
    })

    expect(best).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
  })

  it("ranks a completed match by its new score, and accepts it by that score", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          {
            id: "completed",
            metadata: { titles: [{ value: "Dune" }] },
            fetchDetails: () =>
              Promise.resolve({ titles: [{ value: "Neuromancer" }] }),
          },
          { id: "searched", metadata: { titles: [{ value: "Dune" }] } },
        ]),
      ],
    })

    expect(
      fetched.sources.a?.matches.map(({ id, accepted }) => ({ id, accepted })),
    ).toEqual([
      { id: "searched", accepted: true },
      { id: "completed", accepted: false },
    ])
  })

  it("breaks a tie of score by the provider's own order after details too", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { id: "first", metadata: { titles: [{ value: "Dune Messiah" }] } },
          {
            id: "second",
            metadata: { titles: [{ value: "Dune" }] },
            fetchDetails: () =>
              Promise.resolve({ titles: [{ value: "Dune Messiah" }] }),
          },
        ]),
      ],
    })

    expect(fetched.sources.a?.matches.map(({ id }) => id)).toEqual([
      "first",
      "second",
    ])
  })

  it("scores the metadata the details resolve to", async () => {
    const fetched = await fetchMetadata(
      { ...book, identifiers: [{ value: "9780441013593", scheme: "ISBN" }] },
      {
        providers: [
          providerReturning("a", [
            {
              metadata: { titles: [{ value: "Dune" }] },
              fetchDetails: () =>
                Promise.resolve({
                  titles: [{ value: "Dune" }],
                  identifiers: [{ value: "9780441013593", scheme: "ISBN" }],
                }),
            },
          ]),
        ],
      },
    )

    expect(fetched.matches[0]?.signals).toContainEqual(
      expect.objectContaining({ field: "isbn", score: 1 }),
    )
  })

  it("forwards the signal to the details", async () => {
    const controller = new AbortController()
    const fetchDetails = vi.fn().mockResolvedValue({
      titles: [{ value: "Dune" }],
    })

    await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { titles: [{ value: "Dune" }] }, fetchDetails },
        ]),
      ],
      signal: controller.signal,
    })

    expect(fetchDetails).toHaveBeenCalledWith({ signal: controller.signal })
  })

  it("keeps what search found, and marks the match, when the details fail", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          {
            metadata: { titles: [{ value: "Dune" }] },
            fetchDetails: () =>
              Promise.reject(new MetadataProviderResponseError(429, "slow")),
          },
        ]),
      ],
    })

    expect(fetched.matches).toEqual([
      expect.objectContaining({
        providerId: "a",
        accepted: true,
        metadata: { titles: [{ value: "Dune" }] },
        detailsFailure: { status: 429 },
      }),
    ])
    expect(fetched.failedProviders).toEqual([])
  })

  it("rejects when the caller aborts while details are fetched", async () => {
    const controller = new AbortController()

    await expect(
      fetchMetadata(book, {
        providers: [
          providerReturning("a", [
            {
              metadata: { titles: [{ value: "Dune" }] },
              fetchDetails: () => {
                controller.abort()

                return Promise.reject(new Error("aborted"))
              },
            },
          ]),
        ],
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted")
  })

  it("returns an empty, versioned entity when no provider is passed", async () => {
    expect(await fetchMetadata(book, { providers: [] })).toEqual({
      version: FETCHED_METADATA_VERSION,
      matches: [],
      sources: {},
      failedProviders: [],
    })
  })
})
