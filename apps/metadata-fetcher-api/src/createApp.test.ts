import type {
  FetchedMetadata,
  MetadataProvider,
} from "@prose-reader/metadata-fetcher"
import type { Express } from "express"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "./createApp.ts"

/**
 * `response.json()` is `unknown` — rightly so. These two assert the shape the
 * route under test promises, which is the assertion the test is making
 * anyway; a mismatch fails on the very next expectation.
 */
const readFetched = async (response: Response): Promise<FetchedMetadata> => {
  const body: unknown = await response.json()

  return body as FetchedMetadata
}

const readError = async (response: Response): Promise<{ error: string }> => {
  const body: unknown = await response.json()

  return body as { error: string }
}

const duneProvider: MetadataProvider = {
  id: "stub",
  name: "Stub Catalog",
  search: () =>
    Promise.resolve([
      {
        id: "/works/OL893415W",
        url: "https://example.com/works/OL893415W",
        raw: { note: "verbatim" },
        metadata: {
          title: "Dune",
          publisher: "Chilton Books",
          contributors: [{ name: "Frank Herbert", roles: ["author"] }],
        },
      },
      { metadata: { title: "Neuromancer" } },
    ]),
}

const failingProvider: MetadataProvider = {
  id: "down",
  name: "Down Catalog",
  search: () => Promise.reject(new Error("upstream is down")),
}

const hangingProvider: MetadataProvider = {
  id: "slow",
  name: "Slow Catalog",
  search: (_query, { signal }) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason))
    }),
}

/**
 * Listens on an ephemeral port and drives the app over real HTTP: the routing,
 * the body parser and the status codes are the thing under test, so stubbing
 * express out would test nothing.
 */
const serve = (app: Express) => {
  const server = app.listen(0)

  const origin = () => {
    const address = server.address()

    if (address === null || typeof address === "string") {
      throw new Error("server is not listening on a port")
    }

    return `http://127.0.0.1:${address.port}`
  }

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      }),
    get: (path: string) => fetch(`${origin()}${path}`),
    post: (path: string, body: unknown) =>
      fetch(`${origin()}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
  }
}

const defaults = {
  limit: 5,
  minScore: 0.5,
  requestTimeoutMs: 5_000,
  playground: false,
}

describe("metadata-fetcher-api", () => {
  let api: ReturnType<typeof serve>

  beforeAll(() => {
    api = serve(createApp({ ...defaults, providers: [duneProvider] }))
  })

  afterAll(() => api.close())

  it("reports its health and the providers it exposes", async () => {
    const response = await api.get("/health")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: "ok",
      providers: [{ id: "stub", name: "Stub Catalog" }],
    })
  })

  it("looks a book up from query terms", async () => {
    const response = await api.get(
      "/metadata?title=Dune&author=Frank%20Herbert",
    )
    const fetched = await readFetched(response)

    expect(response.status).toBe(200)
    expect(fetched.metadata.title).toBe("Dune")
    expect(fetched.matches[0]).toMatchObject({
      providerId: "stub",
      accepted: true,
      url: "https://example.com/works/OL893415W",
    })
    expect(fetched.sources.stub?.provider.name).toBe("Stub Catalog")
  })

  it("keeps the unconvincing candidates, ranked and rejected", async () => {
    const fetched = await readFetched(await api.get("/metadata?title=Dune"))

    expect(fetched.matches.map((match) => match.accepted)).toEqual([
      true,
      false,
    ])
  })

  it("accepts a resolved archive posted verbatim", async () => {
    const response = await api.post("/metadata", {
      version: 1,
      metadata: { title: "Dune", numberOfPages: 412 },
      readingOrder: [{ uri: "page-1.jpg" }],
      unreadableSources: [],
    })

    expect(response.status).toBe(200)
    expect((await readFetched(response)).metadata.title).toBe("Dune")
  })

  it("sanitizes a body whose fields are the wrong type", async () => {
    const response = await api.post("/metadata", {
      title: 42,
      contributors: "nope",
      identifiers: [{ value: null }],
      published: { year: "1965" },
    })

    // nothing survived as a search term — a 400, not a 500
    expect(response.status).toBe(400)
    expect((await readError(response)).error).toContain("No search term")
  })

  it("rejects a body that is not a JSON object", async () => {
    expect((await api.post("/metadata", [1, 2, 3])).status).toBe(400)
    expect((await api.post("/metadata", '"just a string"')).status).toBe(400)
  })

  it("rejects malformed JSON without crashing", async () => {
    const response = await api.post("/metadata", "{ not json")

    expect(response.status).toBe(400)
  })

  it("rejects a lookup with nothing to search on", async () => {
    const response = await api.get("/metadata")

    expect(response.status).toBe(400)
    expect((await readError(response)).error).toContain("No search term")
  })

  it("validates the request options", async () => {
    expect((await api.get("/metadata?title=Dune&limit=0")).status).toBe(400)
    expect((await api.get("/metadata?title=Dune&limit=abc")).status).toBe(400)
    expect((await api.get("/metadata?title=Dune&minScore=2")).status).toBe(400)
    expect(
      (await api.get("/metadata?title=Dune&includeRaw=maybe")).status,
    ).toBe(400)
  })

  it("honors the per-request options", async () => {
    const limited = await readFetched(
      await api.get("/metadata?title=Dune&limit=1"),
    )

    expect(limited.matches).toHaveLength(1)

    // the catalog's publisher disagrees, so the match is short of perfect —
    // which is exactly what `minScore=1` refuses
    const strict = await readFetched(
      await api.get("/metadata?title=Dune&publisher=Ace&minScore=1"),
    )

    expect(strict.matches[0]?.accepted).toBe(false)
    expect(strict.metadata).toEqual({})

    const raw = await readFetched(
      await api.get("/metadata?title=Dune&includeRaw=true"),
    )

    expect(raw.matches[0]?.raw).toEqual({ note: "verbatim" })
  })

  it("narrows to the requested providers, and names the unknown ones", async () => {
    expect((await api.get("/metadata?title=Dune&providers=stub")).status).toBe(
      200,
    )

    const unknown = await api.get("/metadata?title=Dune&providers=mangadex")

    expect(unknown.status).toBe(400)
    expect((await readError(unknown)).error).toContain("mangadex")
  })

  it("answers 404 as JSON", async () => {
    const response = await api.get("/nope")

    expect(response.status).toBe(404)
    expect((await readError(response)).error).toContain("/nope")
  })
})

describe("metadata-fetcher-api playground", () => {
  it("serves the page in development", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [duneProvider], playground: true }),
    )

    try {
      const response = await api.get("/")
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toContain("text/html")
      expect(html).toContain('<form id="form">')
      expect(html).toContain('name="title"')
    } finally {
      await api.close()
    }
  })

  it("has no page at all when hosted", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [duneProvider], playground: false }),
    )

    try {
      const response = await api.get("/")

      // a 404 from the API's own handler: the route was never registered,
      // rather than a page hidden behind a check
      expect(response.status).toBe(404)
      expect(response.headers.get("content-type")).toContain("application/json")
      expect((await readError(response)).error).toContain("GET /")
    } finally {
      await api.close()
    }
  })
})

describe("metadata-fetcher-api failures", () => {
  it("answers 502 when every catalog it could ask failed", async () => {
    const api = serve(createApp({ ...defaults, providers: [failingProvider] }))

    try {
      const response = await api.get("/metadata?title=Dune")

      expect(response.status).toBe(502)
      // the entity still says who failed
      expect((await readFetched(response)).failedProviders).toEqual(["down"])
    } finally {
      await api.close()
    }
  })

  it("still answers 200 when only some catalogs failed", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [failingProvider, duneProvider] }),
    )

    try {
      const response = await api.get("/metadata?title=Dune")

      expect(response.status).toBe(200)
      expect((await readFetched(response)).metadata.title).toBe("Dune")
    } finally {
      await api.close()
    }
  })

  it("answers 504 when the lookup outlives its budget", async () => {
    const api = serve(
      createApp({
        ...defaults,
        providers: [hangingProvider],
        requestTimeoutMs: 20,
      }),
    )

    try {
      const response = await api.get("/metadata?title=Dune")

      expect(response.status).toBe(504)
      expect((await readError(response)).error).toContain("timed out")
    } finally {
      await api.close()
    }
  })
})
