import { describe, expect, it } from "vitest"
import { toContainerHref, toContainerUri } from "./toContainerUri.ts"

/**
 * EPUB 3.3 resolves a reference with the URL parser, against the URL of the
 * document making it, inside a container root URL that no `..` leads out of:
 * here, the root of its own origin. The platform's `URL` is the parser
 * browsers implement (WHATWG URL).
 */
const resolveInContainer = (href: string, basePath: string) =>
  new URL(href, new URL(`${basePath}/`, "https://container.invalid/"))

/** Where a streamer serves the book, below other paths of its origin. */
const SERVING_BASE_URL = "https://reader.example/books/1/"

const BASE_PATH = "OEBPS/Text"

const REFERENCES = [
  "chapter.xhtml",
  "../Images/cover.jpg",
  "./chapter.xhtml",
  "Chapter%201.xhtml",
  "Chapter 1.xhtml",
  "%C3%89pilogue.xhtml",
  // a dot a URL parser reads through its escape
  "%2E%2E/Images/cover.jpg",
  ".%2e/Images/cover.jpg",
  "%2e./Images/cover.jpg",
  "%2E/chapter.xhtml",
  // past the container root
  "../../../chapter.xhtml",
  "%2E%2E/%2E%2E/%2E%2E/chapter.xhtml",
  // a file named `%2E%2E`
  "%252E%252E/chapter.xhtml",
  // a query and a fragment, which are no part of the path
  "chapter.xhtml#part/../note",
  "../Text/chapter.xhtml?next=/../cover#./note",
]

describe("toContainerHref", () => {
  it.each(REFERENCES)(
    "%s, joined onto the base URL the book is served at, is the URL its container resolves it to",
    (href) => {
      const { pathname, search, hash } = resolveInContainer(href, BASE_PATH)

      expect(
        new URL(toContainerHref(href, BASE_PATH), SERVING_BASE_URL).href,
      ).toBe(new URL(pathname.slice(1) + search + hash, SERVING_BASE_URL).href)
    },
  )

  it("keeps the escapes of the reference", () => {
    expect(toContainerHref("Chapter%201.xhtml", BASE_PATH)).toBe(
      "OEBPS/Text/Chapter%201.xhtml",
    )
  })

  it("passes an absolute http(s) url through", () => {
    expect(
      toContainerHref("https://cdn.example.com/%2E%2E/page.jpg", BASE_PATH),
    ).toBe("https://cdn.example.com/%2E%2E/page.jpg")
  })
})

describe("toContainerUri", () => {
  it.each(REFERENCES)(
    "%s names the record of the path its container resolves it to",
    (href) => {
      const recordUri = resolveInContainer(href, BASE_PATH)
        .pathname.slice(1)
        .split("/")
        .map(decodeURIComponent)
        .join("/")

      expect(toContainerUri(href, BASE_PATH)).toBe(recordUri)
    },
  )

  it("keeps a segment with a malformed escape as written", () => {
    expect(toContainerUri("Chapter%201/100%.xhtml", BASE_PATH)).toBe(
      "OEBPS/Text/Chapter 1/100%.xhtml",
    )
  })
})
