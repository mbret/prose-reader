import { readFile } from "node:fs/promises"
import {
  type FetchedMetadata,
  type MetadataProvider,
  MetadataProviderResponseError,
} from "@prose-reader/metadata-fetcher"
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js"
import type { Express } from "express"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "./createApp.ts"
import {
  PLAYGROUND_FILE,
  PLAYGROUND_SCRIPT_FILE,
} from "./playground/playground.ts"

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
          publication: { edition: { publisher: "Chilton Books" } },
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

const rateLimitedProvider: MetadataProvider = {
  id: "throttled",
  name: "Throttled Catalog",
  search: () =>
    Promise.reject(new MetadataProviderResponseError(429, "slow down")),
}

const hangingProvider: MetadataProvider = {
  id: "slow",
  name: "Slow Catalog",
  search: (_query, { signal }) =>
    new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason))
    }),
}

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
    postFile: (path: string, body: Uint8Array<ArrayBuffer>, filename: string) =>
      fetch(`${origin()}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-prose-file-name": encodeURIComponent(filename),
          "x-prose-file-type": "application%2Fepub%2Bzip",
        },
        body,
      }),
  }
}

const createEpub = async (): Promise<Uint8Array<ArrayBuffer>> => {
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
  })

  await writer.add(
    "META-INF/container.xml",
    new TextReader(`<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`),
  )
  await writer.add(
    "OPS/package.opf",
    new TextReader(`<?xml version="1.0" encoding="UTF-8"?>
      <package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:identifier>9780441013593</dc:identifier>
          <dc:identifier id="bookid">https://example.com/books/dune</dc:identifier>
          <dc:title>Dune</dc:title>
          <dc:creator>Frank Herbert</dc:creator>
          <dc:language>en</dc:language>
        </metadata>
        <manifest>
          <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
        <spine><itemref idref="chapter"/></spine>
      </package>`),
  )
  await writer.add(
    "OPS/chapter.xhtml",
    new TextReader(
      '<html xmlns="http://www.w3.org/1999/xhtml"><body>Dune</body></html>',
    ),
  )

  return writer.close()
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
      version: 2,
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
      publication: { original: { date: { year: "1965" } } },
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
      await api.get("/metadata?title=Dune&editionPublisher=Ace&minScore=1"),
    )

    expect(strict.matches[0]?.accepted).toBe(false)
    expect(strict.matches[0]?.signals).toContainEqual(
      expect.objectContaining({ field: "publication.edition.publisher" }),
    )
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
  it("serves the page in development, from the file on disk", async () => {
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
      expect(html).toContain('type="file"')
      expect(html).toContain(
        '<script src="/playground/playground.js"></script>',
      )
      expect(html).not.toContain("const form =")
      expect(html).not.toMatch(/localStorage|sessionStorage|indexedDB/)
      // served straight from playground.html, so editing it needs no restart
      expect(html).toBe(await readFile(PLAYGROUND_FILE, "utf8"))

      const scriptResponse = await api.get("/playground/playground.js")
      const script = await scriptResponse.text()

      expect(scriptResponse.status).toBe(200)
      expect(scriptResponse.headers.get("content-type")).toContain(
        "text/javascript",
      )
      expect(script).toContain("/playground/resolve")
      expect(script).not.toMatch(/localStorage|sessionStorage|indexedDB/)
      expect(script).toBe(await readFile(PLAYGROUND_SCRIPT_FILE, "utf8"))
    } finally {
      await api.close()
    }
  })

  it("resolves an uploaded publication in memory", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [duneProvider], playground: true }),
    )

    try {
      const response = await api.postFile(
        "/playground/resolve",
        await createEpub(),
        "dune.epub",
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        title: "Dune",
        isbn: "9780441013593",
        identifiers: [
          { value: "9780441013593" },
          {
            value: "https://example.com/books/dune",
            scheme: "URL",
            unique: true,
          },
        ],
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
        languages: ["en"],
      })
    } finally {
      await api.close()
    }
  })

  it("rejects a file that is not a readable publication", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [duneProvider], playground: true }),
    )

    try {
      const response = await api.postFile(
        "/playground/resolve",
        new TextEncoder().encode("not a zip"),
        "broken.epub",
      )

      expect(response.status).toBe(400)
      expect((await readError(response)).error).toContain("broken.epub")
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

      // the API's own 404: the route was never registered
      expect(response.status).toBe(404)
      expect(response.headers.get("content-type")).toContain("application/json")
      expect((await readError(response)).error).toContain("GET /")

      const upload = await api.postFile(
        "/playground/resolve",
        new Uint8Array([1]),
        "book.epub",
      )

      expect(upload.status).toBe(404)
      expect((await api.get("/playground/playground.js")).status).toBe(404)
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
      expect((await readFetched(response)).failedProviders).toEqual([
        { id: "down" },
      ])
    } finally {
      await api.close()
    }
  })

  it("names the status a catalog failed with", async () => {
    const api = serve(
      createApp({ ...defaults, providers: [rateLimitedProvider] }),
    )

    try {
      const response = await api.get("/metadata?title=Dune")

      expect(response.status).toBe(502)
      expect((await readFetched(response)).failedProviders).toEqual([
        { id: "throttled", status: 429 },
      ])
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
