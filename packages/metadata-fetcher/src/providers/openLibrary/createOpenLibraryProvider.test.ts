import { describe, expect, it, vi } from "vitest"
import { createOpenLibraryProvider } from "./createOpenLibraryProvider.ts"

const DUNE_DOC = {
  key: "/works/OL893415W",
  title: "Dune",
  subtitle: "a novel",
  author_name: ["Frank Herbert"],
  first_publish_year: 1965,
  publisher: ["Chilton Books", "Ace"],
  language: ["eng", "fre"],
  subject: ["Science fiction", "Desert"],
  number_of_pages_median: 412,
  cover_i: 8188413,
}

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  })

const fetchReturning = (...payloads: ReadonlyArray<unknown>) => {
  const fetchMock = vi.fn<typeof globalThis.fetch>()

  for (const payload of payloads) {
    fetchMock.mockResolvedValueOnce(jsonResponse(payload))
  }

  return fetchMock
}

const requestedUrl = (
  fetchMock: ReturnType<typeof fetchReturning>,
  call: number,
) => new URL(String(fetchMock.mock.calls[call]?.[0]))

const context = { limit: 5 }

describe("createOpenLibraryProvider", () => {
  it("looks the book up by ISBN when it states one", async () => {
    const fetchMock = fetchReturning({ docs: [DUNE_DOC] })
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    const candidates = await provider.search(
      { isbn: "9780441013593", title: "Dune" },
      context,
    )

    const url = requestedUrl(fetchMock, 0)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(url.pathname).toBe("/search.json")
    expect(url.searchParams.get("isbn")).toBe("9780441013593")
    expect(url.searchParams.get("limit")).toBe("5")
    expect(url.searchParams.get("fields")).toContain("number_of_pages_median")
    // the catalog confirmed the identity, so the record carries it
    expect(candidates[0]?.metadata.isbn).toBe("9780441013593")
  })

  it("falls back to a title search when the catalog knows no such ISBN", async () => {
    const fetchMock = fetchReturning({ docs: [] }, { docs: [DUNE_DOC] })
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    const candidates = await provider.search(
      {
        isbn: "9780441013593",
        title: "Dune",
        contributors: [{ name: "Frank Herbert", roles: ["author"] }],
      },
      context,
    )

    const fallback = requestedUrl(fetchMock, 1)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fallback.searchParams.get("title")).toBe("Dune")
    expect(fallback.searchParams.get("author")).toBe("Frank Herbert")
    expect(fallback.searchParams.get("isbn")).toBeNull()
    // a title search describes a work, whose editions each have their own
    // ISBN: picking one would be fabrication
    expect(candidates[0]?.metadata.isbn).toBeUndefined()
  })

  it("looks an official Project Gutenberg URL up by Open Library's external id", async () => {
    const identifierValue = "http://www.gutenberg.org/1342"
    const fetchMock = fetchReturning({
      docs: [
        {
          ...DUNE_DOC,
          id_project_gutenberg: ["1342", "42671"],
        },
      ],
    })
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    const candidates = await provider.search(
      {
        identifiers: [{ value: identifierValue, scheme: "URL", unique: true }],
      },
      context,
    )
    const url = requestedUrl(fetchMock, 0)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(url.searchParams.get("q")).toBe("id_project_gutenberg:1342")
    expect(url.searchParams.get("title")).toBeNull()
    expect(url.searchParams.get("fields")).toContain("id_project_gutenberg")
    expect(candidates[0]?.metadata.identifiers).toEqual([
      { value: identifierValue, scheme: "URL" },
      { value: "1342", scheme: "ProjectGutenberg" },
      { value: "42671", scheme: "ProjectGutenberg" },
      { value: DUNE_DOC.key, scheme: "OpenLibrary" },
    ])
  })

  it("falls back to title when Open Library has no Gutenberg cross-reference", async () => {
    const fetchMock = fetchReturning({ docs: [] }, { docs: [DUNE_DOC] })
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    await provider.search(
      {
        title: "Dune",
        identifiers: [
          { value: "https://www.gutenberg.org/ebooks/999999", scheme: "URL" },
        ],
      },
      context,
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requestedUrl(fetchMock, 0).searchParams.get("q")).toBe(
      "id_project_gutenberg:999999",
    )
    expect(requestedUrl(fetchMock, 1).searchParams.get("title")).toBe("Dune")
  })

  it("returns nothing, without asking, when the query has neither ISBN nor title", async () => {
    const fetchMock = fetchReturning()
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    expect(await provider.search({ publisher: "Ace" }, context)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("exposes the record id and url", async () => {
    const provider = createOpenLibraryProvider({
      fetch: fetchReturning({ docs: [DUNE_DOC] }),
    })

    const [candidate] = await provider.search({ title: "Dune" }, context)

    expect(candidate?.id).toBe("/works/OL893415W")
    expect(candidate?.url).toBe("https://openlibrary.org/works/OL893415W")
    expect(candidate?.raw).toMatchObject({ title: "Dune" })
  })

  it("throws on a failing response so the fetch can report the provider", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("nope", { status: 503 }))
    const provider = createOpenLibraryProvider({ fetch: fetchMock })

    await expect(provider.search({ title: "Dune" }, context)).rejects.toThrow(
      "503",
    )
  })

  it("survives a response whose shape it does not recognize", async () => {
    const provider = createOpenLibraryProvider({
      fetch: fetchReturning({ error: "upstream" }, { error: "upstream" }),
    })

    expect(await provider.search({ title: "Dune" }, context)).toEqual([])
  })

  it("sends the user agent only when one is configured", async () => {
    const withAgent = fetchReturning({ docs: [] })
    const withoutAgent = fetchReturning({ docs: [] })

    await createOpenLibraryProvider({
      fetch: withAgent,
      userAgent: "MyReader/1.0 (me@example.com)",
    }).search({ title: "Dune" }, context)
    await createOpenLibraryProvider({ fetch: withoutAgent }).search(
      { title: "Dune" },
      context,
    )

    expect(withAgent.mock.calls[0]?.[1]?.headers).toMatchObject({
      "User-Agent": "MyReader/1.0 (me@example.com)",
    })
    expect(withoutAgent.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      "User-Agent",
    )
  })

  it("honors a custom origin", async () => {
    const fetchMock = fetchReturning({ docs: [DUNE_DOC] })
    const provider = createOpenLibraryProvider({
      fetch: fetchMock,
      baseUrl: "https://mirror.example.com",
      coversBaseUrl: "https://covers.example.com",
    })

    const [candidate] = await provider.search({ title: "Dune" }, context)

    expect(requestedUrl(fetchMock, 0).origin).toBe("https://mirror.example.com")
    expect(candidate?.metadata.cover?.uri).toBe(
      "https://covers.example.com/b/id/8188413-L.jpg",
    )
  })

  it("forwards the abort signal to every request", async () => {
    const fetchMock = fetchReturning({ docs: [] }, { docs: [] })
    const controller = new AbortController()

    await createOpenLibraryProvider({ fetch: fetchMock }).search(
      { isbn: "9780441013593", title: "Dune" },
      { limit: 5, signal: controller.signal },
    )

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
    expect(fetchMock.mock.calls[1]?.[1]?.signal).toBe(controller.signal)
  })
})
