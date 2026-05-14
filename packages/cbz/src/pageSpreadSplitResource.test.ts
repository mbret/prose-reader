import type { Archive, HookResource } from "@prose-reader/streamer"
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildVirtualPageSpreadResourcePath } from "./pageSpreadSplitManifest"
import { pageSpreadSplitResourceHook } from "./pageSpreadSplitResource"

const generatePageSpreadResource = (archive: Archive, resourcePath: string) =>
  pageSpreadSplitResourceHook({ archive, resourcePath })({
    params: {},
  } satisfies HookResource)

describe("pageSpreadSplitResourceHook", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should generate virtual XHTML page spread resources", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const archive: Archive = {
      filename: "",
      records: [
        {
          basename: "p006-007.jpg",
          blob: () => Promise.resolve(source),
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          string: () => Promise.resolve(""),
          uri: "p006-007.jpg",
        },
      ],
      close: () => Promise.resolve(),
    }
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const resourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "right",
      originalUri: "p006-007.jpg",
    })
    const resource = await generatePageSpreadResource(archive, resourcePath)

    expect(resource.params.contentType).toBe("application/xhtml+xml")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual page spread body to be XHTML")
    }

    expect(resource.body).toContain(
      `<meta name="viewport" content="width=50, height=20" />`,
    )
    expect(resource.body).toContain(`transform: translateX(-50px);`)
    expect(resource.body).toContain(
      `<img src="../../../p006-007.jpg" alt="" />`,
    )
    expect(createImageBitmap).toHaveBeenCalledWith(source)
    expect(close).toHaveBeenCalled()
  })

  it("should preserve nested original image paths in virtual page spread resources", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const originalUri = "folder/p006 & 007 [x].jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          basename: "p006 & 007 [x].jpg",
          blob: () => Promise.resolve(source),
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          string: () => Promise.resolve(""),
          uri: originalUri,
        },
      ],
      close: () => Promise.resolve(),
    }
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const resourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "left",
      originalUri,
    })
    const resource = await generatePageSpreadResource(archive, resourcePath)

    expect(resourcePath).toContain("folder%2Fp006%20%26%20007%20%5Bx%5D.jpg")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual page spread body to be XHTML")
    }

    expect(resource.body).toContain(
      `<img src="../../../folder/p006%20&amp;%20007%20%5Bx%5D.jpg" alt="" />`,
    )
    expect(createImageBitmap).toHaveBeenCalledWith(source)
    expect(close).toHaveBeenCalled()
  })

  it("should cache virtual page spread image dimensions by archive and original URI", async () => {
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
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const leftResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "left",
      originalUri,
    })
    const rightResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "right",
      originalUri,
    })

    await generatePageSpreadResource(archive, leftResourcePath)
    await generatePageSpreadResource(archive, rightResourcePath)

    expect(blob).toHaveBeenCalledTimes(1)
    expect(createImageBitmap).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
