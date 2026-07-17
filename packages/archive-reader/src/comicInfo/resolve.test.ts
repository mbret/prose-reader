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

  it("ltr when Manga is explicitly No", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>No</Manga>"))

    expect(resolveComicInfo(parsed)).toEqual({
      readingDirection: "ltr",
    })
  })

  it("ltr when Manga is explicitly Yes (left-to-right manga)", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>Yes</Manga>"))

    expect(resolveComicInfo(parsed)).toEqual({
      readingDirection: "ltr",
    })
  })

  it("undefined readingDirection when Manga tag is absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Title>x</Title>"))

    expect(resolveComicInfo(parsed).readingDirection).toBeUndefined()
  })

  it("undefined readingDirection when Manga is Unknown", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>Unknown</Manga>"))

    expect(resolveComicInfo(parsed).readingDirection).toBeUndefined()
  })

  it("gtin without isbn when value is GTIN-8 only", () => {
    const parsed = parseComicInfo(comicInfoWrap("<GTIN>9638-5074</GTIN>"))

    expect(resolveComicInfo(parsed)).toEqual({
      gtin: "96385074",
    })
  })

  it("forwards Title and Publisher trimmed", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Title>  Sample Story  </Title><Publisher>  Acme  </Publisher>",
      ),
    )

    expect(resolveComicInfo(parsed)).toMatchObject({
      title: "Sample Story",
      publisher: "Acme",
    })
  })

  it("does not fall back to Series when Title is absent", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Series>Sample Series</Series><Number>1</Number>"),
    )

    expect(resolveComicInfo(parsed).title).toBeUndefined()
  })

  it("splits Writer on commas into authors", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Writer>Alice, Bob, Charlie</Writer>"),
    )

    expect(resolveComicInfo(parsed).authors).toEqual([
      "Alice",
      "Bob",
      "Charlie",
    ])
  })

  it("trims and drops empty Writer segments", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Writer>  Alice  ,  ,  Bob  </Writer>"),
    )

    expect(resolveComicInfo(parsed).authors).toEqual(["Alice", "Bob"])
  })

  it("does not include Penciller / Inker / Colorist in authors", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Writer>Alice</Writer>" +
          "<Penciller>Charlie</Penciller>" +
          "<Inker>Dana</Inker>" +
          "<Colorist>Eve</Colorist>",
      ),
    )

    expect(resolveComicInfo(parsed).authors).toEqual(["Alice"])
  })

  it("lifts LanguageISO into a single-entry languages array", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<LanguageISO>en</LanguageISO>"),
    )

    expect(resolveComicInfo(parsed).languages).toEqual(["en"])
  })

  it("omits languages when LanguageISO is whitespace only", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<LanguageISO>   </LanguageISO>"),
    )

    expect(resolveComicInfo(parsed).languages).toBeUndefined()
  })

  it("merges Genre and Tags into subjects, Genre first", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Genre>Science-Fiction, Action</Genre>" +
          "<Tags>school life, ninja</Tags>",
      ),
    )

    expect(resolveComicInfo(parsed).subjects).toEqual([
      "Science-Fiction",
      "Action",
      "school life",
      "ninja",
    ])
  })

  it("returns Genre-only subjects when Tags are absent", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Genre>Science-Fiction, Action</Genre>"),
    )

    expect(resolveComicInfo(parsed).subjects).toEqual([
      "Science-Fiction",
      "Action",
    ])
  })

  it("assembles a date from Year / Month / Day", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Year>2024</Year><Month>12</Month><Day>25</Day>"),
    )

    expect(resolveComicInfo(parsed).date).toEqual({
      year: 2024,
      month: 12,
      day: 25,
    })
  })

  it("preserves a year-only date when Month / Day are absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Year>2024</Year>"))

    expect(resolveComicInfo(parsed).date).toEqual({ year: 2024 })
  })

  it("omits date when Year / Month / Day are all absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Title>x</Title>"))

    expect(resolveComicInfo(parsed).date).toBeUndefined()
  })

  it("ignores non-numeric date components", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Year>two thousand</Year><Month>12</Month>"),
    )

    expect(resolveComicInfo(parsed).date).toEqual({ month: 12 })
  })

  it("does not surface a rights field (ComicInfo has none)", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Title>x</Title><Notes>(c) 2024</Notes>"),
    )

    expect(resolveComicInfo(parsed).rights).toBeUndefined()
  })

  it("rolls up a representative ComicInfo into a single resolve result", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Title>Sample Story</Title>" +
          "<Series>Sample Series</Series>" +
          "<Number>1</Number>" +
          "<Writer>Alice, Bob</Writer>" +
          "<Publisher>Acme</Publisher>" +
          "<LanguageISO>en</LanguageISO>" +
          "<Year>2024</Year>" +
          "<Month>5</Month>" +
          "<Day>3</Day>" +
          "<Genre>Action</Genre>" +
          "<Tags>ninja</Tags>" +
          "<GTIN>978-3-16-148410-0</GTIN>" +
          "<Manga>YesAndRightToLeft</Manga>",
      ),
    )

    expect(resolveComicInfo(parsed)).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
      readingDirection: "rtl",
      title: "Sample Story",
      authors: ["Alice", "Bob"],
      publisher: "Acme",
      languages: ["en"],
      date: { year: 2024, month: 5, day: 3 },
      subjects: ["Action", "ninja"],
    })
  })
})
