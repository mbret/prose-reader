import { mainTitle } from "@prose-reader/archive-reader"
import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchMetadata } from "../../fetchMetadata.ts"
import { scoreMetadataCandidate } from "../../match/scoreMetadataCandidate.ts"
import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import { GOOGLE_BOOKS_PROVIDER_ID } from "../providerIds.ts"
import { createGoogleBooksProvider } from "./createGoogleBooksProvider.ts"

const DUNE_VOLUME = {
  id: "zyTCAlFPjgYC",
  volumeInfo: {
    title: "Dune",
    authors: ["Frank Herbert"],
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9780441013593" }],
    averageRating: 4.5,
    ratingsCount: 128,
    canonicalVolumeLink:
      "http://books.google.com/books/about/Dune.html?id=zyTCAlFPjgYC",
  },
  saleInfo: { saleability: "FOR_SALE" },
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

/** A response whose body stays open until something cancels it. */
const responseWithOpenBody = (status: number) => {
  const cancel = vi.fn()
  const response = new Response(
    new ReadableStream({ pull: () => {}, cancel }),
    {
      status,
    },
  )

  return { response, cancel }
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
        aggregateRating: { value: 4.5, count: 128 },
      },
    })
    expect(candidate?.raw).toMatchObject({
      saleInfo: { saleability: "FOR_SALE" },
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
    expect(candidate?.metadata.identifiers).toContainEqual({
      value: "zyTCAlFPjgYC",
      scheme: "GoogleBooks",
    })
    expect(candidate?.metadata.identifiers).not.toContainEqual({
      value,
      scheme: "URL",
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
      "intitle:Dune inauthor:Frank Herbert",
    )
    expect(mainTitle(candidates[0]?.metadata)).toBe("Dune")
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
      "intitle:Dune inauthor:A misspelled author",
    )
    expect(requestedUrl(fetchMock, 1).searchParams.get("q")).toBe(
      "intitle:Dune",
    )
  })

  it("sends a multi-word title unquoted, so Google ranks instead of filtering", async () => {
    const fetchMock = fetchReturning(jsonResponse({ items: [DUNE_VOLUME] }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search({ title: "Dune  Messiah v02 (Digital)" }, context)

    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      "intitle:Dune Messiah v02 (Digital)",
    )
  })

  it("drops quotes a title carries, which would unbalance the query", async () => {
    const fetchMock = fetchReturning(jsonResponse({ items: [DUNE_VOLUME] }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search({ title: 'The "Dune" \\ Companion' }, context)

    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      "intitle:The Dune Companion",
    )
  })

  it("keeps a colon in a term from promoting the rest into another field", async () => {
    const fetchMock = fetchReturning(jsonResponse({ items: [DUNE_VOLUME] }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search(
      { title: "Dune inauthor:Asimov", authors: ["isbn:9780441013593"] },
      context,
    )

    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      "intitle:Dune inauthor Asimov inauthor:isbn 9780441013593",
    )
  })

  it("keeps a hyphenated title from excluding its own words", async () => {
    const fetchMock = fetchReturning(jsonResponse({ items: [DUNE_VOLUME] }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search({ title: "BLAME! -Master Edition-" }, context)

    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      "intitle:BLAME! Master Edition-",
    )
  })

  it("returns nothing, without asking, when a title is all query syntax", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>()
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    expect(await provider.search({ title: ' -: "" ' }, context)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("asks a title search for more than the caller keeps, letting the matcher rank", async () => {
    const fetchMock = fetchReturning(jsonResponse({ totalItems: 0 }))
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await provider.search({ title: "Dune" }, { limit: 5 })

    expect(requestedUrl(fetchMock, 0).searchParams.get("maxResults")).toBe("20")
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

  it("releases a failed response's body before retrying", async () => {
    vi.useFakeTimers()
    const failed = responseWithOpenBody(503)
    const fetchMock = fetchReturning(failed.response, jsonResponse(DUNE_VOLUME))
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

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(failed.cancel).toHaveBeenCalledTimes(1)

    await vi.runAllTimersAsync()
    await expect(pending).resolves.toHaveLength(1)
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

  it("retries a rate limit after the Retry-After it asks for", async () => {
    vi.useFakeTimers()
    vi.spyOn(Math, "random").mockReturnValue(0)
    const fetchMock = fetchReturning(
      new Response("{}", { status: 429, headers: { "Retry-After": "2" } }),
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

    // the computed backoff would retry after 1s; Google asked for 2s
    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("retries a rate limit that states no Retry-After with backoff", async () => {
    vi.useFakeTimers()
    const fetchMock = fetchReturning(
      jsonResponse({}, 429),
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
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("reports a rate limit at once when its Retry-After is beyond the bound", async () => {
    const fetchMock = fetchReturning(
      new Response("{}", { status: 429, headers: { "Retry-After": "60" } }),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })

    await expect(
      provider.search(
        {
          identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }],
        },
        context,
      ),
    ).rejects.toMatchObject({ status: 429, retryAfterMs: 60_000 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

/**
 * Google's own link shapes: a search result links the two small sizes, from
 * `books/content`; a volume's record links every size Google holds, the
 * publisher's from `books/publisher/content`, signed with `imgtk`. Both draw
 * the page curl.
 */
const searchResultImageLinks = (id: string) => ({
  smallThumbnail: `http://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=5&edge=curl&source=gbs_api`,
  thumbnail: `http://books.google.com/books/content?id=${id}&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api`,
})

const publisherCoverLink = (id: string, zoom: number) =>
  `http://books.google.com/books/publisher/content?id=${id}&printsec=frontcover&img=1&zoom=${zoom}&edge=curl&imgtk=AFLRE7${zoom}signed&source=gbs_api`

const DUNE_SEARCH_RESULT = {
  ...DUNE_VOLUME,
  volumeInfo: {
    ...DUNE_VOLUME.volumeInfo,
    description: "A desert epic.",
    categories: ["Fiction"],
    imageLinks: searchResultImageLinks("zyTCAlFPjgYC"),
  },
}

const DUNE_VOLUME_RECORD = {
  ...DUNE_VOLUME,
  volumeInfo: {
    ...DUNE_VOLUME.volumeInfo,
    description: "<p>A desert <b>epic</b>.</p>",
    categories: ["Fiction / Science Fiction / Space Opera"],
    imageLinks: {
      ...searchResultImageLinks("zyTCAlFPjgYC"),
      small: publisherCoverLink("zyTCAlFPjgYC", 2),
      medium: publisherCoverLink("zyTCAlFPjgYC", 3),
      large: publisherCoverLink("zyTCAlFPjgYC", 4),
      extraLarge: publisherCoverLink("zyTCAlFPjgYC", 6),
    },
  },
}

const DUNE_EXTRA_LARGE_COVER =
  "https://books.google.com/books/publisher/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=6&imgtk=AFLRE76signed&source=gbs_api"

const NEUROMANCER_SEARCH_RESULT = {
  id: "neuromancer-id",
  volumeInfo: {
    title: "Neuromancer",
    authors: ["William Gibson"],
    imageLinks: searchResultImageLinks("neuromancer-id"),
  },
}

const duneLookup: FetchMetadataInput = {
  title: "Dune",
  authors: ["Frank Herbert"],
}

describe("createGoogleBooksProvider covers", () => {
  it("gives an accepted search match the largest cover of its volume record, without the curl", async () => {
    const fetchMock = fetchReturning(
      jsonResponse({
        items: [DUNE_SEARCH_RESULT, NEUROMANCER_SEARCH_RESULT],
      }),
      jsonResponse(DUNE_VOLUME_RECORD),
    )
    const controller = new AbortController()
    const fetched = await fetchMetadata(duneLookup, {
      providers: [
        createGoogleBooksProvider({ apiKey: "secret", fetch: fetchMock }),
      ],
      signal: controller.signal,
    })
    const volumeRecordUrl = requestedUrl(fetchMock, 1)

    // one request for the accepted match, none for the rejected one
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(volumeRecordUrl.pathname).toBe("/books/v1/volumes/zyTCAlFPjgYC")
    expect(volumeRecordUrl.searchParams.get("key")).toBe("secret")
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      signal: controller.signal,
    })
    expect(
      fetched.matches.map(({ accepted, metadata }) => ({
        accepted,
        cover: metadata.cover,
      })),
    ).toEqual([
      {
        accepted: true,
        cover: { uri: DUNE_EXTRA_LARGE_COVER, confidence: "derived" },
      },
      {
        accepted: false,
        cover: {
          uri: "https://books.google.com/books/content?id=neuromancer-id&printsec=frontcover&img=1&zoom=1&source=gbs_api",
          confidence: "derived",
        },
      },
    ])
    expect(fetched.failedProviders).toEqual([])
  })

  it("takes only the cover from the volume record", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(
        jsonResponse({ items: [DUNE_SEARCH_RESULT] }),
        jsonResponse(DUNE_VOLUME_RECORD),
      ),
    })
    const [candidate] = await provider.search(duneLookup, context)

    expect(await candidate?.fetchDetails?.({})).toEqual({
      ...candidate?.metadata,
      cover: { uri: DUNE_EXTRA_LARGE_COVER, confidence: "derived" },
    })
    expect(candidate?.metadata).toMatchObject({
      description: "A desert epic.",
      subjects: ["Fiction"],
    })
  })

  it("completes an ISBN match the same way", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(jsonResponse({ items: [DUNE_SEARCH_RESULT] })),
    })
    const [candidate] = await provider.search(
      { identifiers: [{ value: "9780441013593", scheme: "ISBN" }] },
      context,
    )

    expect(candidate?.fetchDetails).toBeInstanceOf(Function)
  })

  it("asks for no volume record when search links no image, or an extra large one", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(
        jsonResponse({
          items: [
            { id: "no-cover", volumeInfo: { title: "Dune" } },
            {
              id: "extra-large-cover",
              volumeInfo: {
                title: "Dune",
                imageLinks: {
                  extraLarge: publisherCoverLink("extra-large-cover", 6),
                },
              },
            },
          ],
        }),
      ),
    })
    const candidates = await provider.search({ title: "Dune" }, context)

    expect(candidates.map(({ fetchDetails }) => fetchDetails)).toEqual([
      undefined,
      undefined,
    ])
  })

  it("asks for the volume record when search links a large cover but no extra large one", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(
        jsonResponse({
          items: [
            {
              id: "large-cover",
              volumeInfo: {
                title: "Dune",
                imageLinks: { large: publisherCoverLink("large-cover", 4) },
              },
            },
          ],
        }),
      ),
    })
    const [candidate] = await provider.search({ title: "Dune" }, context)

    expect(candidate?.fetchDetails).toBeInstanceOf(Function)
  })

  it("asks for no volume record when the volume was read by its id", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(jsonResponse(DUNE_SEARCH_RESULT)),
    })
    const [candidate] = await provider.search(
      { identifiers: [{ value: "zyTCAlFPjgYC", scheme: "GoogleBooks" }] },
      context,
    )

    expect(candidate).toBeDefined()
    expect(candidate?.fetchDetails).toBeUndefined()
  })

  it("keeps the searched cover when the volume record is gone", async () => {
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchReturning(
        jsonResponse({ items: [DUNE_SEARCH_RESULT] }),
        jsonResponse({}, 404),
      ),
    })
    const [candidate] = await provider.search(duneLookup, context)

    expect(await candidate?.fetchDetails?.({})).toEqual(candidate?.metadata)
  })

  it("retries a rate-limited volume record request", async () => {
    vi.useFakeTimers()
    const fetchMock = fetchReturning(
      jsonResponse({ items: [DUNE_SEARCH_RESULT] }),
      new Response("{}", { status: 429, headers: { "Retry-After": "1" } }),
      jsonResponse(DUNE_VOLUME_RECORD),
    )
    const provider = createGoogleBooksProvider({
      apiKey: "secret",
      fetch: fetchMock,
    })
    const [candidate] = await provider.search(duneLookup, context)
    const pending = candidate?.fetchDetails?.({})

    await vi.advanceTimersByTimeAsync(1_000)

    await expect(pending).resolves.toMatchObject({
      cover: { uri: DUNE_EXTRA_LARGE_COVER },
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("keeps the thumbnail of a volume Google knows only from a catalog", async () => {
    const fetchMock = fetchReturning(
      jsonResponse({ items: [DUNE_SEARCH_RESULT] }),
      // the record links the same two small sizes as the search result
      jsonResponse(DUNE_SEARCH_RESULT),
    )
    const fetched = await fetchMetadata(duneLookup, {
      providers: [
        createGoogleBooksProvider({ apiKey: "secret", fetch: fetchMock }),
      ],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetched.matches).toEqual([
      expect.not.objectContaining({ detailsFailure: expect.anything() }),
    ])
    expect(fetched.matches[0]?.metadata.cover).toEqual({
      uri: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      confidence: "derived",
    })
  })

  it("keeps the searched cover, and marks the match, when the volume record fails", async () => {
    const fetched = await fetchMetadata(duneLookup, {
      providers: [
        createGoogleBooksProvider({
          apiKey: "secret",
          fetch: fetchReturning(
            jsonResponse({ items: [DUNE_SEARCH_RESULT] }),
            jsonResponse({}, 403),
          ),
        }),
      ],
    })

    expect(fetched.matches).toEqual([
      expect.objectContaining({
        providerId: GOOGLE_BOOKS_PROVIDER_ID,
        detailsFailure: { status: 403 },
        metadata: expect.objectContaining({
          cover: {
            uri: "https://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
            confidence: "derived",
          },
        }),
      }),
    ])
    expect(fetched.failedProviders).toEqual([])
  })
})
