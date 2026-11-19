import { describe, expect, it } from "vitest"
import {
  detectMimeTypeFromName,
  detectMimeTypeFromUrl,
  isMediaContentMimeType,
  parseContentType,
} from "./contentType.ts"

describe("parseContentType", () => {
  it("should keep mime type without parameters", () => {
    expect(parseContentType("image/jpeg")).toBe("image/jpeg")
  })

  it("should remove parameters from mime type", () => {
    expect(parseContentType("text/html; charset=UTF-8")).toBe("text/html")
  })
})

describe("isMediaContentMimeType", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])(
    "should return true for %s",
    (mimeType) => {
      expect(isMediaContentMimeType(mimeType)).toBe(true)
    },
  )

  it.each(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/flac"])(
    "should return true for %s",
    (mimeType) => {
      expect(isMediaContentMimeType(mimeType)).toBe(true)
    },
  )

  it.each(["video/mp4", "video/webm"])(
    "should return true for %s",
    (mimeType) => {
      expect(isMediaContentMimeType(mimeType)).toBe(true)
    },
  )

  it.each(["application/xhtml+xml", "text/plain", "text/html"])(
    "should return false for %s",
    (mimeType) => {
      expect(isMediaContentMimeType(mimeType)).toBe(false)
    },
  )
})

describe("detectMimeTypeFromName", () => {
  it.each([
    ["page.png", "image/png"],
    ["page.jpeg", "image/jpeg"],
    ["page.gif", "image/gif"],
    ["page.webp", "image/webp"],
    ["page.avif", "image/avif"],
    ["page.bmp", "image/bmp"],
    ["page.tif", "image/tiff"],
    ["page.tiff", "image/tiff"],
    ["cover.svg", "image/svg+xml"],
  ])("detects the image type of %s", (name, mimeType) => {
    expect(detectMimeTypeFromName(name)).toBe(mimeType)
  })

  it("is case-insensitive on the extension", () => {
    expect(detectMimeTypeFromName("COVER.JPG")).toBe("image/jpg")
    expect(detectMimeTypeFromName("Scan.TIFF")).toBe("image/tiff")
  })

  it("returns undefined for an unknown extension", () => {
    expect(detectMimeTypeFromName("book.opf")).toBeUndefined()
  })

  it("reads the extension of a name that holds a # or a ?", () => {
    expect(detectMimeTypeFromName("Batman #12 - 001.jpg")).toBe("image/jpg")
    expect(detectMimeTypeFromName("Who? 01/page.png")).toBe("image/png")
  })

  it("returns undefined for a name without an extension", () => {
    expect(detectMimeTypeFromName("png")).toBeUndefined()
  })
})

describe("detectMimeTypeFromUrl", () => {
  it.each([
    ["https://cdn.example.com/page-1.jpg?token=abc", "image/jpg"],
    ["https://cdn.example.com/page-2.png#page", "image/png"],
    ["https://cdn.example.com/Batman%20%2312.jpg", "image/jpg"],
    ["chapter.xhtml#section-2", "application/xhtml+xml"],
  ])("detects the type %s's path names", (url, mimeType) => {
    expect(detectMimeTypeFromUrl(url)).toBe(mimeType)
  })
})
