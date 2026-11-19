import { describe, expect, it } from "vitest"
import {
  getUriBasename,
  getUriBasePath,
  getUriExtension,
  removeTrailingSlash,
} from "./uri.ts"

describe("getUriBasename", () => {
  it("returns the file name for a nested file uri", () => {
    expect(getUriBasename("OEBPS/content.opf")).toBe("content.opf")
  })

  it("returns the uri itself when there is no slash", () => {
    expect(getUriBasename("ComicInfo.xml")).toBe("ComicInfo.xml")
  })

  it("returns the folder name for a top-level directory uri", () => {
    expect(getUriBasename("OEBPS/")).toBe("OEBPS")
  })

  it("returns the folder name for a nested directory uri", () => {
    expect(getUriBasename("OEBPS/images/")).toBe("images")
  })

  it("ignores a leading slash", () => {
    expect(getUriBasename("/foo")).toBe("foo")
  })

  it("returns an empty string for an empty uri", () => {
    expect(getUriBasename("")).toBe("")
  })
})

describe("removeTrailingSlash", () => {
  it("removes a single trailing slash", () => {
    expect(removeTrailingSlash("OEBPS/")).toBe("OEBPS")
  })

  it("leaves a uri without a trailing slash untouched", () => {
    expect(removeTrailingSlash("OEBPS/content.opf")).toBe("OEBPS/content.opf")
  })
})

describe("getUriBasePath", () => {
  it("returns the directory portion of a nested uri", () => {
    expect(getUriBasePath("OEBPS/content.opf")).toBe("OEBPS")
  })

  it("returns an empty string when there is no slash", () => {
    expect(getUriBasePath("content.opf")).toBe("")
  })
})

describe("getUriExtension", () => {
  it.each([
    ["Batman #12.cbz", "cbz"],
    ["What? Vol.2.cbz", "cbz"],
    ["pages/Batman #12 - 001.JPG", "JPG"],
    ["archive.tar.gz", "gz"],
  ])("reads %s after the last dot of its last segment", (uri, extension) => {
    expect(getUriExtension(uri)).toBe(extension)
  })

  it.each(["README", ".hidden", "notes.", "OEBPS.v2/content"])(
    "returns an empty string for %s, whose last segment has no extension",
    (uri) => {
      expect(getUriExtension(uri)).toBe("")
    },
  )
})
