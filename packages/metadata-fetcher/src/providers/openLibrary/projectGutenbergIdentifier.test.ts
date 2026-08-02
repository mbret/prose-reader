import { describe, expect, it } from "vitest"
import { projectGutenbergLookupFromMetadata } from "./projectGutenbergIdentifier.ts"

describe("projectGutenbergLookupFromMetadata", () => {
  it.each([
    "http://www.gutenberg.org/78139",
    "https://www.gutenberg.org/ebooks/78139",
    "https://www.gutenberg.org/ebooks/78139.epub3.images",
    "https://www.gutenberg.org/files/78139/78139-h/78139-h.htm",
    "https://gutenberg.org/cache/epub/78139/pg78139-images.html",
  ])("extracts the id from an official Gutenberg URL: %s", (value) => {
    expect(
      projectGutenbergLookupFromMetadata({
        identifiers: [{ value, scheme: "URL" }],
      }),
    ).toEqual({ id: "78139", identifier: { value, scheme: "URL" } })
  })

  it("does not reinterpret arbitrary URLs or authored identifier types", () => {
    expect(
      projectGutenbergLookupFromMetadata({
        identifiers: [
          { value: "https://example.com/78139", scheme: "URL" },
          {
            value: "https://www.gutenberg.org/78139",
            scheme: "DOI",
          },
        ],
      }),
    ).toBeUndefined()
  })
})
