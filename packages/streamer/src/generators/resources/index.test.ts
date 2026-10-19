import { blobFileAccessors, createArchive } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import { generateResourceFromArchive } from "./index"

describe("generateResourceFromArchive", () => {
  it("should apply external hooks before archive fallback", async () => {
    const archive = createArchive({
      filename: "",
      records: [],
      close: () => Promise.resolve(),
    })

    const resource = await generateResourceFromArchive(archive, "virtual.txt", {
      hooks: [
        () => async (resource) => ({
          ...resource,
          body: "hooked",
          params: {
            ...resource.params,
            contentType: "text/plain",
          },
        }),
      ],
    })

    expect(resource).toEqual({
      body: "hooked",
      params: {
        contentType: "text/plain",
      },
    })
  })

  it("should return the archive resource without external hooks", async () => {
    const source = new Blob(["source"], { type: "text/plain" })
    const archive = createArchive({
      filename: "",
      records: [
        {
          ...blobFileAccessors(() => Promise.resolve(source)),
          basename: "page.txt",
          dir: false,
          size: source.size,
          uri: "page.txt",
        },
      ],
      close: () => Promise.resolve(),
    })

    const resource = await generateResourceFromArchive(archive, "page.txt")

    expect(resource.body).toBe(source)
  })
})

describe("Given a resource its package document lists", () => {
  // EPUB 2 books commonly name chapters `.html` and declare them XHTML.
  const opf =
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata/><manifest>` +
    `<item id="c1" href="../Text/chapter1.html" media-type="application/xhtml+xml"/>` +
    `<item id="c2" href="Chapter%202.html" media-type="application/xhtml+xml"/>` +
    `</manifest><spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`

  const textRecord = (uri: string, content = "") => ({
    ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
    basename: uri.split("/").pop() ?? uri,
    dir: false as const,
    size: content.length,
    uri,
  })

  const archive = createArchive({
    filename: "book.epub",
    records: [
      textRecord("OEBPS/Package/content.opf", opf),
      textRecord("OEBPS/Text/chapter1.html"),
      textRecord("OEBPS/Package/Chapter 2.html"),
    ],
    close: () => Promise.resolve(),
  })

  it.each([
    ["by an href out of its folder", "OEBPS/Text/chapter1.html"],
    ["by an escaped href", "OEBPS/Package/Chapter 2.html"],
  ])(
    "serves one listed %s with the media type it declares",
    async (_, resourcePath) => {
      const resource = await generateResourceFromArchive(archive, resourcePath)

      expect(resource.params.contentType).toBe("application/xhtml+xml")
    },
  )
})
