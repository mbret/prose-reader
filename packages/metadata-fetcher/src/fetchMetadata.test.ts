import type {
  ResolvedArchive,
  ResolvedMetadata,
} from "@prose-reader/archive-reader"
import { describe, expect, it, vi } from "vitest"
import { fetchMetadata } from "./fetchMetadata.ts"
import { MetadataProviderResponseError } from "./providers/responseError.ts"
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

const book: ResolvedMetadata = {
  title: "Dune",
  contributors: [{ name: "Frank Herbert", roles: ["author"] }],
}

describe("fetchMetadata", () => {
  it("accepts a resolved archive as well as bare metadata", async () => {
    const providers = [
      providerReturning("a", [
        { metadata: { title: "Dune", publisher: "Ace" } },
      ]),
    ]
    // the shape `resolveArchive` returns, projections included
    const resolved: Pick<
      ResolvedArchive,
      "version" | "metadata" | "unreadableSources"
    > = { version: 1, metadata: book, unreadableSources: [] }

    const fromArchive = await fetchMetadata(resolved, { providers })
    const fromMetadata = await fetchMetadata(book, { providers })

    expect(fromArchive.metadata).toEqual({ title: "Dune", publisher: "Ace" })
    expect(fromMetadata.metadata).toEqual(fromArchive.metadata)
  })

  it("hands every provider the metadata itself, verbatim", async () => {
    const search = vi.fn().mockResolvedValue([])

    await fetchMetadata(book, {
      providers: [{ id: "a", name: "A", search }],
      limit: 3,
    })

    // no query projection in between: what the book said is what a provider
    // reads, down to the format-scoped corners
    expect(search).toHaveBeenCalledWith(
      book,
      expect.objectContaining({ limit: 3 }),
    )
  })

  it("ranks matches across providers, best first", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("weak", [{ metadata: { title: "Duna" } }]),
        providerReturning("strong", [{ metadata: { title: "Dune" } }]),
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
        providerReturning("first", [{ metadata: { title: "Dune" } }]),
        providerReturning("second", [{ metadata: { title: "Dune" } }]),
      ],
    })

    expect(fetched.matches.map((match) => match.providerId)).toEqual([
      "first",
      "second",
    ])
  })

  it("merges only the accepted matches, best first", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("weak", [
          { metadata: { title: "Something Else", publisher: "Wrong" } },
        ]),
        providerReturning("strong", [
          { metadata: { title: "Dune", numberOfPages: 412 } },
        ]),
      ],
    })

    expect(fetched.metadata).toEqual({ title: "Dune", numberOfPages: 412 })
  })

  it("keeps the rejected matches, ranked, for manual confirmation", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [{ metadata: { title: "Neuromancer" } }]),
      ],
    })

    expect(fetched.metadata).toEqual({})
    expect(fetched.matches).toHaveLength(1)
    expect(fetched.matches[0]?.accepted).toBe(false)
    expect(fetched.sources.a?.matches[0]?.signals).toContainEqual(
      expect.objectContaining({ field: "title" }),
    )
  })

  it("honors minScore", async () => {
    const providers = [
      providerReturning("a", [{ metadata: { title: "Dune Messiah" } }]),
    ]

    expect(
      (await fetchMetadata(book, { providers, minScore: 1 })).metadata,
    ).toEqual({})
    expect(
      (await fetchMetadata(book, { providers, minScore: 0.1 })).metadata,
    ).toEqual({ title: "Dune Messiah" })
  })

  it("caps the matches a provider contributes, best first", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        providerReturning("a", [
          { metadata: { title: "Neuromancer" } },
          { metadata: { title: "Dune" } },
          { metadata: { title: "Duna" } },
        ]),
      ],
      limit: 2,
    })

    expect(
      fetched.sources.a?.matches.map((match) => match.metadata.title),
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
    // a provider on another HTTP client throws that client's error, which
    // carries the status structurally
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
      // a network error carries no status, which is itself the answer
      { id: "network" },
    ])
  })

  it("survives a failing provider and lists it", async () => {
    const fetched = await fetchMetadata(book, {
      providers: [
        failingProvider("down"),
        providerReturning("up", [{ metadata: { title: "Dune" } }]),
      ],
    })

    expect(fetched.failedProviders).toEqual([{ id: "down" }])
    expect(fetched.sources).not.toHaveProperty("down")
    expect(fetched.metadata).toEqual({ title: "Dune" })
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
      providerReturning("a", [{ metadata: { title: "Dune" }, raw: { id: 1 } }]),
    ]

    expect(
      (await fetchMetadata(book, { providers })).matches[0],
    ).not.toHaveProperty("raw")
    expect(
      (await fetchMetadata(book, { providers, includeRaw: true })).matches[0]
        ?.raw,
    ).toEqual({ id: 1 })
  })

  it("returns an empty, versioned entity when no provider is passed", async () => {
    expect(await fetchMetadata(book, { providers: [] })).toEqual({
      version: 1,
      metadata: {},
      matches: [],
      sources: {},
      failedProviders: [],
    })
  })
})
