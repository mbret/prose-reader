import { afterEach, describe, expect, it, vi } from "vitest"
import { scoreMetadataCandidate } from "../../match/scoreMetadataCandidate.ts"
import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import { createGoogleBooksProvider } from "./createGoogleBooksProvider.ts"

const DUNE_VOLUME = {
  id: "zyTCAlFPjgYC",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9780441013593" }],
    averageRating: 4.5,
    canonicalVolumeLink:
      "http://books.google.com/books/about/Dune.html?id=zyTCAlFPjgYC",
  },
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  })

const fetchReturning = (...responses: ReadonlyArray<Response>) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>()

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response)
  }

  return fetchMock
}

const requestedUrl = (
  fetchMock: ReturnType<typeof fetchReturning>,
  call: number,
) => new URL(String(fetchMock.mock.calls[call]?.[0]))

const context = { limit: 5 }

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("createGoogleBooksProvider", () => {
  it("requires an API key", () => {
    expect(() => createGoogleBooksProvider({ apiKey: "  " })).toThrow("apiKey")
  })

  it("fetches and confirms a Google Books volume identifier", async () => {
    const fetchMock = fetchReturning(jsonResponse(DUNE_VOLUME))
    const controller = new AbortController()
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const input: FetchMetadataInput = {
      title: "A locally edited title",
      identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
    }
    const [candidate] = await provider.search(input, {
      ...context,
      signal: controller.signal,
    })
    const url = requestedUrl(fetchMock, 0)

    expect(url.pathname).toBe("/books/v1/volumes/zyTCAlFPjgYC")
    expect(url.searchParams.get("key")).toBe("secret")
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
    expect(candidate).toMatchObject({
      id: "zyTCAlFPjgYC",
      url: "https://books.google.com/books/about/Dune.html?id=zyTCAlFPjgYC",
      metadata: {
        identifiers: expect.arrayContaining([
          { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
        ]),
      },
    })
    expect(candidate?.raw).toMatchObject({
      volumeInfo: { averageRating: 4.5 },
    })
    expect(scoreMetadataCandidate(input, candidate?.metadata ?? {}).score).toBe(
      1,
    )
  })

  it("fetches and confirms an official Google Books URL", async () => {
    const fetchMock = fetchReturning(jsonResponse(DUNE_VOLUME))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const value =
      "https://books.google.com/books?id=zyTCAlFPjgYC&printsec=frontcover"
    const input: FetchMetadataInput = {
      identifiers: [{ value, scheme: "URL" }],
    }
    const [candidate] = await provider.search(input, context)

    expect(requestedUrl(fetchMock, 0).pathname).toBe(
      "/books/v1/volumes/zyTCAlFPjgYC",
    )
    expect(candidate?.metadata.identifiers).toEqual(
      expect.arrayContaining([
        { value, scheme: "URL" },
        { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
      ]),
    )
    expect(scoreMetadataCandidate(input, candidate?.metadata ?? {}).score).toBe(
      1,
    )
  })

  it("looks a book up by ISBN and preserves Google's result list", async () => {
    const fetchMock = fetchReturning(
      jsonResponse({
        items: [DUNE_VOLUME, { ...DUNE_VOLUME, id: "edition-2" }],
      }),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const candidates = await provider.search(
      {
        identifiers: [{ value: "978-0-441-01359-3", scheme: "ISBN" }],
        title: "Dune",
      },
      context,
    )
    const url = requestedUrl(fetchMock, 0)

    expect(url.searchParams.get("q")).toBe("isbn:9780441013593")
    expect(url.searchParams.get("maxResults")).toBe("5")
    expect(url.searchParams.get("orderBy")).toBe("relevance")
    expect(url.searchParams.get("printType")).toBe("books")
    expect(candidates).toHaveLength(2)
    expect(candidates[0]?.metadata.identifiers).toContainEqual({
      value: "9780441013593",
      scheme: "ISBN",
    })
  })

  it("falls back from a missing id and ISBN to title plus author", async () => {
    const fetchMock = fetchReturning(
      jsonResponse({}, 404),
      jsonResponse({ totalItems: 0 }),
      jsonResponse({ items: [DUNE_VOLUME] }),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const candidates = await provider.search(
      {
        title: "Dune",
        authors: ["Frank Herbert"],
        identifiers: [
          { value: "0000000000", scheme: "ISBN" },
          { value: "missing", scheme: "GoogleBooks" },
        ],
      },
      context,
    )

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestedUrl(fetchMock, 2).searchParams.get("q")).toBe(
      'intitle:"Dune" inauthor:"Frank Herbert"',
    )
    expect(candidates[0]?.metadata.title).toBe("Dune")
  })

  it("falls back to title-only when author makes the query too narrow", async () => {
    const fetchMock = fetchReturning(
      jsonResponse({ totalItems: 0 }),
      jsonResponse({ items: [DUNE_VOLUME] }),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search(
      { title: "Dune", authors: ["A misspelled author"] },
      context,
    )

    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      'intitle:"Dune" inauthor:"A misspelled author"',
    )
    expect(requestedUrl(fetchMock, 1).searchParams.get("q")).toBe(
      'intitle:"Dune"',
    )
  })

  it("returns nothing, without asking, when no lookup term exists", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>()
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    expect(await provider.search({ publisher: "Ace" }, context)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("retries transient upstream failures and succeeds", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    const fetchMock = fetchReturning(
      jsonResponse({}, 503),
      jsonResponse({}, 503),
      jsonResponse(DUNE_VOLUME),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const pending = provider.search(
      {
        identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
      },
      context,
    )

    await vi.runAllTimersAsync()

    await expect(pending).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("retries a network failure", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValue(jsonResponse(DUNE_VOLUME))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const pending = provider.search(
      {
        identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
      },
      context,
    )

    await vi.runAllTimersAsync()

    await expect(pending).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("throws the final transient upstream failure after three attempts", async () => {
    vi.useFakeTimers()
    const unavailable = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(
        jsonResponse({}, 503),
        jsonResponse({}, 503),
        jsonResponse({}, 503),
      ),
    })
    const input = {
      identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
    }
    const pending = unavailable.search(input, context)
    const rejected = expect(pending).rejects.toThrow("503")

    await vi.runAllTimersAsync()
    await rejected
  })

  it("does not retry client errors or malformed successful responses", async () => {
    const forbiddenFetch = fetchReturning(jsonResponse({}, 403))
    const forbidden = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: forbiddenFetch,
    })
    const invalid = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(jsonResponse({ id: "another-volume" })),
    })
    const input = {
      identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
    }

    await expect(forbidden.search(input, context)).rejects.toThrow("403")
    expect(forbiddenFetch).toHaveBeenCalledTimes(1)
    await expect(invalid.search(input, context)).rejects.toThrow(
      "requested volume",
    )
  })

  it("caps Google's page size at its API maximum", async () => {
    const fetchMock = fetchReturning(jsonResponse({ totalItems: 0 }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search({ title: "Dune" }, { limit: 100 })

    expect(requestedUrl(fetchMock, 0).searchParams.get("maxResults")).toBe("40")
  })

  it("honors a custom API root", async () => {
    const fetchMock = fetchReturning(jsonResponse({ items: [DUNE_VOLUME] }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      baseUrl: "https://catalog.example.com/google/v1/",
      fetch: fetchMock,
    })

    await provider.search({ title: "Dune" }, context)

    expect(requestedUrl(fetchMock, 0).toString()).toContain(
      "https://catalog.example.com/google/v1/volumes",
    )
  })
})
