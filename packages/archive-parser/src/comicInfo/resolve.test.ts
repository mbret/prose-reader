import { describe, expect, it } from "vitest"
import { parseComicInfo } from "./parse"
import { resolveComicInfo } from "./resolve"

const comicInfoWrap = (body: string) =>
  `<?xml version="1.0"?>` +
  `<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
  `xmlns:xsd="http://www.w3.org/2001/XMLSchema">${body}</ComicInfo>`

describe("resolveComicInfo", () => {
  it("isbn from GTIN, readingDirection from Manga", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<GTIN>978-3-16-148410-0</GTIN><Manga>YesAndRightToLeft</Manga>",
      ),
    )

    expect(resolveComicInfo(parsed)).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
      readingDirection: "rtl",
    })
  })

  it("ltr when Manga absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Title>x</Title>"))

    expect(resolveComicInfo(parsed)).toEqual({
      readingDirection: "ltr",
    })
  })

  it("gtin without isbn when value is GTIN-8 only", () => {
    const parsed = parseComicInfo(comicInfoWrap("<GTIN>9638-5074</GTIN>"))

    expect(resolveComicInfo(parsed)).toEqual({
      gtin: "96385074",
      readingDirection: "ltr",
    })
  })
})
