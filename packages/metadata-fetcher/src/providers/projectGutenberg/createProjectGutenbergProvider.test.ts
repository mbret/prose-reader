import { describe, expect, it, vi } from "vitest"
import { scoreMetadataCandidate } from "../../match/scoreMetadataCandidate.ts"
import type { FetchMetadataInput } from "../../types/fetchMetadataInput.ts"
import { createProjectGutenbergProvider } from "./createProjectGutenbergProvider.ts"

const PROJECT_GUTENBERG_RDF_FIXTURE = `<rdf:RDF
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:pgterms="http://www.gutenberg.org/2009/pgterms/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
>
  <pgterms:ebook rdf:about="ebooks/78139">
    <dcterms:title>Wilhelm Meister's apprenticeship and travels, vol. 2 (of 2)</dcterms:title>
  </pgterms:ebook>
</rdf:RDF>`

const context = { limit: 5 }

describe("createProjectGutenbergProvider", () => {
  it("fetches and confirms an official Gutenberg URL", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(PROJECT_GUTENBERG_RDF_FIXTURE))
    const controller = new AbortController()
    const provider = createProjectGutenbergProvider({
      fetch: fetchMock,
      userAgent: "MyReader/1.0 (me@example.com)",
    })
    const input: FetchMetadataInput = {
      title: "A locally edited title",
      identifiers: [
        {
          value: "http://www.gutenberg.org/78139",
          scheme: "URL",
        },
      ],
    }

    const [candidate] = await provider.search(input, {
      ...context,
      signal: controller.signal,
    })
    const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]))

    expect(requestUrl.pathname).toBe("/cache/epub/78139/pg78139.rdf")
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      signal: controller.signal,
      headers: {
        Accept: "application/rdf+xml, application/xml;q=0.9",
        "User-Agent": "MyReader/1.0 (me@example.com)",
      },
    })
    expect(candidate).toMatchObject({
      id: "78139",
      url: "https://www.gutenberg.org/ebooks/78139",
      metadata: {
        title: "Wilhelm Meister's apprenticeship and travels, vol. 2 (of 2)",
        identifiers: [
          { value: "http://www.gutenberg.org/78139", scheme: "URL" },
          { value: "78139", scheme: "ProjectGutenberg" },
        ],
      },
    })
    expect(scoreMetadataCandidate(input, candidate?.metadata ?? {}).score).toBe(
      1,
    )
  })

  it("also looks up a numeric ProjectGutenberg identifier", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(PROJECT_GUTENBERG_RDF_FIXTURE))
    const provider = createProjectGutenbergProvider({ fetch: fetchMock })

    const [candidate] = await provider.search(
      { identifiers: [{ value: "78139", scheme: "ProjectGutenberg" }] },
      context,
    )

    expect(candidate?.metadata.identifiers).toContainEqual({
      value: "78139",
      scheme: "ProjectGutenberg",
    })
  })

  it("does not ask Gutenberg without a recognized identifier", async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>()
    const provider = createProjectGutenbergProvider({ fetch: fetchMock })

    expect(await provider.search({ title: "Dune" }, context)).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("treats a missing eBook as no result", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("missing", { status: 404 }))
    const provider = createProjectGutenbergProvider({ fetch: fetchMock })

    expect(
      await provider.search(
        {
          identifiers: [
            { value: "https://www.gutenberg.org/ebooks/999999", scheme: "URL" },
          ],
        },
        context,
      ),
    ).toEqual([])
  })

  it("throws on upstream failures and invalid successful responses", async () => {
    const unavailable = createProjectGutenbergProvider({
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("nope", { status: 503 })),
    })
    const invalid = createProjectGutenbergProvider({
      fetch: vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response("<html/>")),
    })
    const input = {
      identifiers: [
        { value: "https://www.gutenberg.org/ebooks/78139", scheme: "URL" },
      ],
    }

    await expect(unavailable.search(input, context)).rejects.toThrow("503")
    await expect(invalid.search(input, context)).rejects.toThrow(
      "did not contain the requested eBook",
    )
  })

  it("honors a custom catalog origin", async () => {
    const fetchMock = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(PROJECT_GUTENBERG_RDF_FIXTURE))
    const provider = createProjectGutenbergProvider({
      fetch: fetchMock,
      baseUrl: "https://gutenberg.example.com",
    })

    const [candidate] = await provider.search(
      {
        identifiers: [
          { value: "https://www.gutenberg.org/ebooks/78139", scheme: "URL" },
        ],
      },
      context,
    )

    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).origin).toBe(
      "https://gutenberg.example.com",
    )
    expect(candidate?.url).toBe("https://gutenberg.example.com/ebooks/78139")
  })
})
