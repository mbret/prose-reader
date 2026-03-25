import { describe, expect, it } from "vitest"
import { isMediaContentMimeType, parseContentType } from "./contentType"

describe("parseContentType", () => {
  it("should keep mime type without parameters", () => {
    expect(parseContentType("image/jpeg")).toBe("image/jpeg")
  })

  it("should remove parameters from mime type", () => {
    expect(parseContentType("text/html; charset=UTF-8")).toBe("text/html")
  })
})

describe("isMediaContentMimeType", () => {
  it.each([
    "image/jpeg",
    "image/png",
    "image/webp",
  ])("should return true for %s", (mimeType) => {
    expect(isMediaContentMimeType(mimeType)).toBe(true)
  })

  it.each([
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/flac",
  ])("should return true for %s", (mimeType) => {
    expect(isMediaContentMimeType(mimeType)).toBe(true)
  })

  it.each([
    "video/mp4",
    "video/webm",
  ])("should return true for %s", (mimeType) => {
    expect(isMediaContentMimeType(mimeType)).toBe(true)
  })

  it.each([
    "application/xhtml+xml",
    "text/plain",
    "text/html",
  ])("should return false for %s", (mimeType) => {
    expect(isMediaContentMimeType(mimeType)).toBe(false)
  })
})
