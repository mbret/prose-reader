import { describe, expect, it } from "vitest"
import { getUriBasename, getUriBasePath, removeTrailingSlash } from "./uri"

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
