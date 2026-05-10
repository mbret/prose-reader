import { describe, expect, it } from "vitest"
import { createManifestResourceHref } from "./createManifestResourceHref"

describe("createManifestResourceHref", () => {
  it("should create encoded file hrefs without a base URL", () => {
    expect(
      createManifestResourceHref({
        resourcePath: "Chapter 1/page [1].jpg",
      }),
    ).toBe("file://Chapter%201/page%20%5B1%5D.jpg")
  })

  it("should create encoded hrefs with a normalized base URL", () => {
    expect(
      createManifestResourceHref({
        baseUrl: "http://localhost:9000/streamer/book",
        resourcePath:
          "__prose-reader__/page-spread/folder%2Fpage.jpg/left.xhtml",
      }),
    ).toBe(
      "http://localhost:9000/streamer/book/__prose-reader__/page-spread/folder%252Fpage.jpg/left.xhtml",
    )
  })

  it("should keep absolute resource paths absolute without a base URL", () => {
    expect(
      createManifestResourceHref({
        resourcePath: "https://example.com/Chapter 1/page.jpg",
      }),
    ).toBe("https://example.com/Chapter%201/page.jpg")
  })
})
