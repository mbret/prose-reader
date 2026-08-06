import { describe, expect, it, vi } from "vitest"
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
      identifiers: [
        {
          value: "https://books.google.com/books?id=zyTCAlFPjgYC",
          scheme: "URL",
        },
      ],
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
          {
            value: "https://books.google.com/books?id=zyTCAlFPjgYC",
            scheme: "URL",
          },
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
      { isbn: "978-0-441-01359-3", title: "Dune" },
      context,
    )
    const url = requestedUrl(fetchMock, 0)

    expect(url.searchParams.get("q")).toBe("isbn:978-0-441-01359-3")
    expect(url.searchParams.get("maxResults")).toBe("5")
    expect(url.searchParams.get("orderBy")).toBe("relevance")
    expect(url.searchParams.get("printType")).toBe("books")
    expect(candidates).toHaveLength(2)
    expect(candidates[0]?.metadata.isbn).toBe("9780441013593")
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
        isbn: "0000000000",
        identifiers: [{ value: "missing", scheme: "GoogleBooks" }],
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

  it("throws on upstream failures and malformed exact responses", async () => {
    const unavailable = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(jsonResponse({}, 503)),
    })
    const invalid = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(jsonResponse({ id: "another-volume" })),
    })
    const input = {
      identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
    }

    await expect(unavailable.search(input, context)).rejects.toThrow("503")
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
