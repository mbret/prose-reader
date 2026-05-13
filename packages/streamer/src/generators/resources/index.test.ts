import { afterEach, describe, expect, it, vi } from "vitest"
import type { Archive } from "../../archives/types"
import { buildImageWrapperResourcePathFromOriginalUri } from "../../cbz/pageSpreadSplitManifest"
import { generateResourceFromArchive } from "./index"

describe("generateResourceFromArchive", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should generate reflowable XHTML page spread wrapper resources", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const blob = vi.fn(() => Promise.resolve(source))
    const archive: Archive = {
      filename: "",
      records: [
        {
          basename: "p006-007.jpg",
          blob,
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          string: () => Promise.resolve(""),
          uri: "p006-007.jpg",
        },
      ],
      close: () => Promise.resolve(),
    }

    const resourcePath = buildImageWrapperResourcePathFromOriginalUri({
      originalUri: "p006-007.jpg",
    })
    const resource = await generateResourceFromArchive(archive, resourcePath)

    expect(resource.params.contentType).toBe("application/xhtml+xml")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual page spread body to be XHTML")
    }

    expect(resource.body).not.toContain(`<meta name="viewport"`)
    expect(resource.body).toContain(
      `<img id="spread-image" src="../../p006-007.jpg" alt="" />`,
    )
    expect(blob).not.toHaveBeenCalled()
  })

  it("should preserve nested original image paths in XHTML image wrappers", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const blob = vi.fn(() => Promise.resolve(source))
    const originalUri = "folder/p006 & 007 [x].jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          basename: "p006 & 007 [x].jpg",
          blob,
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          string: () => Promise.resolve(""),
          uri: originalUri,
        },
      ],
      close: () => Promise.resolve(),
    }

    const resourcePath = buildImageWrapperResourcePathFromOriginalUri({
      originalUri,
    })
    const resource = await generateResourceFromArchive(archive, resourcePath)

    expect(resourcePath).toContain("__prose-reader__/image-wrapper/pr-img-")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual page spread body to be XHTML")
    }

    expect(resource.body).toContain(
      `<img id="spread-image" src="../../folder/p006%20&amp;%20007%20%5Bx%5D.jpg" alt="" />`,
    )
    expect(blob).not.toHaveBeenCalled()
  })

  it("should generate image wrappers without decoding image dimensions", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const blob = vi.fn(() => Promise.resolve(source))
    const originalUri = "p006-007.jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          basename: originalUri,
          blob,
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          string: () => Promise.resolve(""),
          uri: originalUri,
        },
      ],
      close: () => Promise.resolve(),
    }
    const resourcePath = buildImageWrapperResourcePathFromOriginalUri({
      originalUri,
    })

    await generateResourceFromArchive(archive, resourcePath)
    await generateResourceFromArchive(archive, resourcePath)

    expect(blob).not.toHaveBeenCalled()
  })
})
