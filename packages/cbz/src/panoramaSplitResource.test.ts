import {
  type Archive,
  blobFileAccessors,
  createArchive,
  type HookResource,
} from "@prose-reader/streamer"
import { afterEach, describe, expect, it, vi } from "vitest"
import { buildVirtualPanoramaResourcePath } from "./panoramaSplitManifest"
import { panoramaSplitResourceHook } from "./panoramaSplitResource"

const generatePanoramaResource = (archive: Archive, resourcePath: string) =>
  panoramaSplitResourceHook({ archive, resourcePath })({
    params: {},
  } satisfies HookResource)

describe("panoramaSplitResourceHook", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("should generate virtual XHTML panorama resources", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const archive = createArchive({
      filename: "",
      records: [
        {
          basename: "p006-007.jpg",
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          uri: "p006-007.jpg",
          ...blobFileAccessors(() => Promise.resolve(source)),
        },
      ],
      close: () => Promise.resolve(),
    })
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const resourcePath = buildVirtualPanoramaResourcePath({
      cropSide: "right",
      originalUri: "p006-007.jpg",
    })
    const resource = await generatePanoramaResource(archive, resourcePath)

    expect(resource.params.contentType).toBe("application/xhtml+xml")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual panorama body to be XHTML")
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

  it("should preserve nested original image paths in virtual panorama resources", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const originalUri = "folder/p006 & 007 [x].jpg"
    const archive = createArchive({
      filename: "",
      records: [
        {
          basename: "p006 & 007 [x].jpg",
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          uri: originalUri,
          ...blobFileAccessors(() => Promise.resolve(source)),
        },
      ],
      close: () => Promise.resolve(),
    })
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const resourcePath = buildVirtualPanoramaResourcePath({
      cropSide: "left",
      originalUri,
    })
    const resource = await generatePanoramaResource(archive, resourcePath)

    expect(resourcePath).toContain("folder%2Fp006%20%26%20007%20%5Bx%5D.jpg")

    if (typeof resource.body !== "string") {
      throw new Error("Expected virtual panorama body to be XHTML")
    }

    expect(resource.body).toContain(
      `<img src="../../../folder/p006%20&amp;%20007%20%5Bx%5D.jpg" alt="" />`,
    )
    expect(createImageBitmap).toHaveBeenCalledWith(source)
    expect(close).toHaveBeenCalled()
  })

  it("should cache virtual panorama image dimensions by archive and original URI", async () => {
    const source = new Blob(["source"], { type: "image/jpeg" })
    const blob = vi.fn(() => Promise.resolve(source))
    const originalUri = "p006-007.jpg"
    const archive = createArchive({
      filename: "",
      records: [
        {
          basename: originalUri,
          dir: false,
          encodingFormat: "image/jpeg",
          size: source.size,
          uri: originalUri,
          ...blobFileAccessors(blob),
        },
      ],
      close: () => Promise.resolve(),
    })
    const close = vi.fn()
    const bitmap = {
      close,
      height: 20,
      width: 100,
    }
    const createImageBitmap = vi.fn(() => Promise.resolve(bitmap))

    vi.stubGlobal("createImageBitmap", createImageBitmap)

    const leftResourcePath = buildVirtualPanoramaResourcePath({
      cropSide: "left",
      originalUri,
    })
    const rightResourcePath = buildVirtualPanoramaResourcePath({
      cropSide: "right",
      originalUri,
    })

    await generatePanoramaResource(archive, leftResourcePath)
    await generatePanoramaResource(archive, rightResourcePath)

    expect(blob).toHaveBeenCalledTimes(1)
    expect(createImageBitmap).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
