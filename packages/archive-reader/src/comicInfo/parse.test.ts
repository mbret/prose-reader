import { describe, expect, it } from "vitest"
import { normalizeIsbn } from "../utils/normalizeIsbn"
import { parseComicInfo } from "./parse"

const minimalComicInfo = (body = "") =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
  `xmlns:xsd="http://www.w3.org/2001/XMLSchema">${body}</ComicInfo>`

describe("parseComicInfo", () => {
  it("returns an empty object for a minimal ComicInfo document", () => {
    expect(parseComicInfo(minimalComicInfo())).toEqual({ kind: "comicInfo" })
  })

  it("copies GTIN text verbatim", () => {
    const xml = minimalComicInfo("<GTIN>9783161484100</GTIN>")

    expect(parseComicInfo(xml)).toEqual({
      kind: "comicInfo",
      GTIN: "9783161484100",
    })
  })

  it("leaves ISBN normalisation to normalizeIsbn", () => {
    const xml = minimalComicInfo("<GTIN>097522980x</GTIN>")
    const parsed = parseComicInfo(xml)

    expect(parsed).toEqual({ kind: "comicInfo", GTIN: "097522980x" })
    expect(normalizeIsbn(parsed.GTIN)).toBe("097522980X")
  })

  it("preserves urn:isbn and other prefixes on GTIN", () => {
    const xml = minimalComicInfo("<GTIN>urn:isbn:9783161484100</GTIN>")
    const parsed = parseComicInfo(xml)

    expect(parsed.GTIN).toBe("urn:isbn:9783161484100")
    expect(normalizeIsbn(parsed.GTIN)).toBe("9783161484100")
  })

  it("preserves ISBN: prefix on GTIN", () => {
    const xml = minimalComicInfo("<GTIN>ISBN: 9783161484100</GTIN>")
    const parsed = parseComicInfo(xml)

    expect(parsed.GTIN).toBe("ISBN: 9783161484100")
    expect(normalizeIsbn(parsed.GTIN)).toBe("9783161484100")
  })

  it("preserves hyphenated GTIN", () => {
    const xml = minimalComicInfo("<GTIN>978-3-16-148410-0</GTIN>")
    const parsed = parseComicInfo(xml)

    expect(parsed.GTIN).toBe("978-3-16-148410-0")
    expect(normalizeIsbn(parsed.GTIN)).toBe("9783161484100")
  })

  it("trims surrounding whitespace on GTIN", () => {
    const xml = minimalComicInfo("<GTIN>  9783161484100  </GTIN>")

    expect(parseComicInfo(xml)).toEqual({
      kind: "comicInfo",
      GTIN: "9783161484100",
    })
  })

  it("keeps free-text GTIN; normalizeIsbn can still find an ISBN", () => {
    const xml = minimalComicInfo(
      "<GTIN>Catalogue number 9783161484100, edition 2</GTIN>",
    )
    const parsed = parseComicInfo(xml)

    expect(parsed.GTIN).toBe("Catalogue number 9783161484100, edition 2")
    expect(normalizeIsbn(parsed.GTIN)).toBe("9783161484100")
  })

  it("returns unrelated barcode only under GTIN", () => {
    const xml = minimalComicInfo("<GTIN>0123456</GTIN>")

    expect(parseComicInfo(xml)).toEqual({
      kind: "comicInfo",
      GTIN: "0123456",
    })
    expect(normalizeIsbn(parseComicInfo(xml).GTIN)).toBeUndefined()
  })

  it("omits GTIN when the element is whitespace only", () => {
    const xml = minimalComicInfo("<GTIN>   </GTIN>")

    expect(parseComicInfo(xml)).toEqual({ kind: "comicInfo" })
  })

  it("parses Title, Series, Number with XML names", () => {
    const xml = minimalComicInfo(
      "<Title>Foo</Title><Series>Bar</Series><Number>1</Number>",
    )

    expect(parseComicInfo(xml)).toEqual({
      kind: "comicInfo",
      Title: "Foo",
      Series: "Bar",
      Number: "1",
    })
  })

  it("does not blow up on a real-world document with many sibling fields", () => {
    const xml = minimalComicInfo(
      "<Title>Sample</Title>" +
        "<Series>Sample Series</Series>" +
        "<Number>1</Number>" +
        "<Count>12</Count>" +
        "<Volume>2018</Volume>" +
        "<Summary>Lorem ipsum.</Summary>" +
        "<Year>2024</Year>" +
        "<Month>5</Month>" +
        "<Day>3</Day>" +
        "<Writer>Alice, Bob</Writer>" +
        "<Penciller>Charlie</Penciller>" +
        "<Inker>Dana</Inker>" +
        "<Colorist>Eve</Colorist>" +
        "<Letterer>Frank</Letterer>" +
        "<CoverArtist>Grace</CoverArtist>" +
        "<Editor>Heidi</Editor>" +
        "<Translator>Ivan</Translator>" +
        "<Publisher>Acme</Publisher>" +
        "<Imprint>Vertigo</Imprint>" +
        "<Genre>Science-Fiction, Action</Genre>" +
        "<Tags>school life, ninja</Tags>" +
        "<Web>https://example.com/book</Web>" +
        "<PageCount>32</PageCount>" +
        "<LanguageISO>en</LanguageISO>" +
        "<Format>Digital</Format>" +
        "<BlackAndWhite>No</BlackAndWhite>" +
        "<Manga>YesAndRightToLeft</Manga>" +
        "<Characters>Alice, Bob</Characters>" +
        "<Teams>Avengers</Teams>" +
        "<Locations>Paris</Locations>" +
        "<MainCharacterOrTeam>Alice</MainCharacterOrTeam>" +
        "<ScanInformation>scanned by foo</ScanInformation>" +
        "<StoryArc>Destiny, Unity</StoryArc>" +
        "<StoryArcNumber>1, 2</StoryArcNumber>" +
        "<SeriesGroup>Multiverse</SeriesGroup>" +
        "<AgeRating>Teen</AgeRating>" +
        "<CommunityRating>4.5</CommunityRating>" +
        "<Review>Great book.</Review>" +
        "<GTIN>978-3-16-148410-0</GTIN>" +
        "<Pages>" +
        '<Page Image="0" Type="FrontCover" ImageSize="12345" ImageWidth="800" ImageHeight="1200" />' +
        '<Page Image="1" Type="Story" />' +
        "</Pages>",
    )

    expect(parseComicInfo(xml)).toEqual({
      kind: "comicInfo",
      AgeRating: "Teen",
      BlackAndWhite: "No",
      Characters: "Alice, Bob",
      Colorist: "Eve",
      CommunityRating: "4.5",
      Count: "12",
      CoverArtist: "Grace",
      Day: "3",
      Editor: "Heidi",
      Format: "Digital",
      Genre: "Science-Fiction, Action",
      GTIN: "978-3-16-148410-0",
      Imprint: "Vertigo",
      Inker: "Dana",
      LanguageISO: "en",
      Letterer: "Frank",
      Locations: "Paris",
      MainCharacterOrTeam: "Alice",
      Manga: "YesAndRightToLeft",
      Month: "5",
      Number: "1",
      PageCount: "32",
      Penciller: "Charlie",
      Publisher: "Acme",
      Review: "Great book.",
      ScanInformation: "scanned by foo",
      Series: "Sample Series",
      SeriesGroup: "Multiverse",
      StoryArc: "Destiny, Unity",
      StoryArcNumber: "1, 2",
      Summary: "Lorem ipsum.",
      Tags: "school life, ninja",
      Teams: "Avengers",
      Title: "Sample",
      Translator: "Ivan",
      Volume: "2018",
      Web: "https://example.com/book",
      Writer: "Alice, Bob",
      Year: "2024",
    })
  })

  it("throws a labelled error when the input is not XML at all", () => {
    expect(() => parseComicInfo("not xml")).toThrow(
      /ComicInfo\.xml is malformed/i,
    )
  })

  it("preserves the underlying parser error as the thrown error's cause", () => {
    let captured: unknown
    try {
      parseComicInfo("not xml")
    } catch (error) {
      captured = error
    }

    if (!(captured instanceof Error)) {
      throw new Error("expected parseComicInfo to throw an Error")
    }
    expect(captured.cause).toBeInstanceOf(Error)
  })
})
