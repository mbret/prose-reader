import { describe, expect, it } from "vitest"
import { parseComicInfo } from "./parse"
import { resolveComicInfo } from "./resolve"

const comicInfoWrap = (body: string) =>
  `<?xml version="1.0"?>` +
  `<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
  `xmlns:xsd="http://www.w3.org/2001/XMLSchema">${body}</ComicInfo>`

describe("resolveComicInfo", () => {
  it("normalizes GTIN as an identifier and resolves Manga direction", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<GTIN>978-3-16-148410-0</GTIN><Manga>YesAndRightToLeft</Manga>",
      ),
    )

    expect(resolveComicInfo(parsed)).toEqual({
      identifiers: [{ value: "978-3-16-148410-0", scheme: "GTIN" }],
      readingDirection: "rtl",
      comic: { manga: true },
    })
  })

  it("ltr when Manga is explicitly No", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>No</Manga>"))

    expect(resolveComicInfo(parsed)).toEqual({
      readingDirection: "ltr",
      comic: { manga: false },
    })
  })

  it("ltr when Manga is explicitly Yes (left-to-right manga)", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>Yes</Manga>"))

    expect(resolveComicInfo(parsed)).toEqual({
      readingDirection: "ltr",
      comic: { manga: true },
    })
  })

  it("undefined readingDirection when Manga tag is absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Title>x</Title>"))

    expect(resolveComicInfo(parsed).readingDirection).toBeUndefined()
  })

  it("undefined readingDirection when Manga is Unknown", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Manga>Unknown</Manga>"))

    const resolved = resolveComicInfo(parsed)
    expect(resolved.readingDirection).toBeUndefined()
    expect(resolved.comic).toBeUndefined()
  })

  it("keeps a GTIN-8 identifier", () => {
    const parsed = parseComicInfo(comicInfoWrap("<GTIN>9638-5074</GTIN>"))

    expect(resolveComicInfo(parsed)).toEqual({
      identifiers: [{ value: "9638-5074", scheme: "GTIN" }],
    })
  })

  it("promotes valid ComicInfo Web references to URL identifiers", () => {
    const googleBooksUrl = "https://books.google.com/books?id=k028AAAACAAJ"
    const gutenbergUrl = "https://www.gutenberg.org/ebooks/78139"
    const parsed = parseComicInfo(
      comicInfoWrap(
        `<Web>${googleBooksUrl} ${gutenbergUrl} not-a-url ${googleBooksUrl}</Web>`,
      ),
    )

    expect(resolveComicInfo(parsed)).toEqual({
      identifiers: [
        { value: googleBooksUrl, scheme: "URL" },
        { value: gutenbergUrl, scheme: "URL" },
      ],
      comic: {
        web: [googleBooksUrl, gutenbergUrl, "not-a-url", googleBooksUrl],
      },
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
      publication: { edition: { publisher: "Acme" } },
    })
  })

  it("does not fall back to Series when Title is absent", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Series>Sample Series</Series><Number>1</Number>"),
    )

    expect(resolveComicInfo(parsed).title).toBeUndefined()
  })

  it("splits Writer on commas into author contributors", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Writer>Alice, Bob, Charlie</Writer>"),
    )

    expect(resolveComicInfo(parsed).contributors).toEqual([
      { name: "Alice", roles: ["author"] },
      { name: "Bob", roles: ["author"] },
      { name: "Charlie", roles: ["author"] },
    ])
  })

  it("trims and drops empty Writer segments", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Writer>  Alice  ,  ,  Bob  </Writer>"),
    )

    expect(resolveComicInfo(parsed).contributors).toEqual([
      { name: "Alice", roles: ["author"] },
      { name: "Bob", roles: ["author"] },
    ])
  })

  it("attributes comic roles per field, keeping author distinct", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Writer>Alice</Writer>" +
          "<Penciller>Charlie</Penciller>" +
          "<Inker>Dana</Inker>" +
          "<Colorist>Eve</Colorist>" +
          "<Letterer>Frank</Letterer>" +
          "<CoverArtist>Grace</CoverArtist>" +
          "<Editor>Heidi</Editor>" +
          "<Translator>Ivan</Translator>",
      ),
    )

    expect(resolveComicInfo(parsed).contributors).toEqual([
      { name: "Alice", roles: ["author"] },
      { name: "Charlie", roles: ["penciler"] },
      { name: "Dana", roles: ["inker"] },
      { name: "Eve", roles: ["colorist"] },
      { name: "Frank", roles: ["letterer"] },
      { name: "Grace", roles: ["coverArtist"] },
      { name: "Heidi", roles: ["editor"] },
      { name: "Ivan", roles: ["translator"] },
    ])
  })

  it("merges roles when the same person appears in several fields", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Writer>Alice</Writer><Penciller>Alice, Bob</Penciller><Inker>Alice</Inker>",
      ),
    )

    expect(resolveComicInfo(parsed).contributors).toEqual([
      { name: "Alice", roles: ["author", "penciler", "inker"] },
      { name: "Bob", roles: ["penciler"] },
    ])
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

  it("assembles the edition publication date from Year / Month / Day", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Year>2024</Year><Month>12</Month><Day>25</Day>"),
    )

    expect(resolveComicInfo(parsed).publication?.edition?.date).toEqual({
      year: 2024,
      month: 12,
      day: 25,
    })
  })

  it("preserves a year-only date when Month / Day are absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Year>2024</Year>"))

    expect(resolveComicInfo(parsed).publication?.edition?.date).toEqual({
      year: 2024,
    })
  })

  it("omits the edition date when Year / Month / Day are all absent", () => {
    const parsed = parseComicInfo(comicInfoWrap("<Title>x</Title>"))

    expect(resolveComicInfo(parsed).publication).toBeUndefined()
  })

  it("ignores non-numeric date components", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Year>two thousand</Year><Month>12</Month>"),
    )

    expect(resolveComicInfo(parsed).publication?.edition?.date).toEqual({
      month: 12,
    })
  })

  it("does not surface a rights field (ComicInfo has none)", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Title>x</Title><Notes>(c) 2024</Notes>"),
    )

    expect(resolveComicInfo(parsed).rights).toBeUndefined()
  })

  it("maps Series / Number / Count into belongsTo.series", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<Series>Sample Series</Series><Number>1.5</Number><Count>12</Count>",
      ),
    )

    expect(resolveComicInfo(parsed).belongsTo).toEqual({
      series: [{ name: "Sample Series", position: 1.5, total: 12 }],
    })
  })

  it("keeps a non-numeric Number out of the series position", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<Series>Sample Series</Series><Number>1AU</Number>"),
    )

    expect(resolveComicInfo(parsed).belongsTo).toEqual({
      series: [{ name: "Sample Series" }],
    })
  })

  it("maps SeriesGroup entries into belongsTo.collection", () => {
    const parsed = parseComicInfo(
      comicInfoWrap("<SeriesGroup>Family A, Family B</SeriesGroup>"),
    )

    expect(resolveComicInfo(parsed).belongsTo).toEqual({
      collection: [{ name: "Family A" }, { name: "Family B" }],
    })
  })

  it("zips StoryArc and StoryArcNumber positionally into the comic corner", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<StoryArc>Arc One, Arc Two</StoryArc><StoryArcNumber>1, 3</StoryArcNumber>",
      ),
    )

    expect(resolveComicInfo(parsed).comic?.storyArcs).toEqual([
      { name: "Arc One", position: 1 },
      { name: "Arc Two", position: 3 },
    ])
  })

  it("maps AlternateSeries / AlternateNumber / AlternateCount into the comic corner", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<AlternateSeries>Crossover</AlternateSeries>" +
          "<AlternateNumber>2</AlternateNumber>" +
          "<AlternateCount>6</AlternateCount>",
      ),
    )

    expect(resolveComicInfo(parsed).comic?.alternateSeries).toEqual({
      name: "Crossover",
      position: 2,
      total: 6,
    })
  })

  it("normalizes the comic-scoped fields", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<BlackAndWhite>Yes</BlackAndWhite>" +
          "<Volume>3</Volume>" +
          "<Format>TPB</Format>" +
          "<AgeRating>Teen</AgeRating>" +
          "<CommunityRating>4.5</CommunityRating>" +
          "<Notes>scanned</Notes>" +
          "<Review>great</Review>" +
          "<Web>https://a.example https://b.example</Web>" +
          "<ScanInformation>group x</ScanInformation>" +
          "<MainCharacterOrTeam>Hero</MainCharacterOrTeam>" +
          "<Characters>Hero, Sidekick</Characters>" +
          "<Teams>Team A</Teams>" +
          "<Locations>City</Locations>",
      ),
    )

    expect(resolveComicInfo(parsed).comic).toEqual({
      blackAndWhite: true,
      volume: 3,
      format: "TPB",
      ageRating: "Teen",
      communityRating: 4.5,
      notes: "scanned",
      review: "great",
      web: ["https://a.example", "https://b.example"],
      scanInformation: "group x",
      mainCharacterOrTeam: "Hero",
      characters: ["Hero", "Sidekick"],
      teams: ["Team A"],
      locations: ["City"],
    })
  })

  it("maps PageCount, Summary and Imprint into the shared vocabulary", () => {
    const parsed = parseComicInfo(
      comicInfoWrap(
        "<PageCount>32</PageCount>" +
          "<Summary>A short synopsis.</Summary>" +
          "<Imprint>Vertigo</Imprint>",
      ),
    )

    expect(resolveComicInfo(parsed)).toMatchObject({
      numberOfPages: 32,
      description: "A short synopsis.",
      publication: { edition: { imprint: "Vertigo" } },
    })
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
      identifiers: [{ value: "978-3-16-148410-0", scheme: "GTIN" }],
      readingDirection: "rtl",
      title: "Sample Story",
      contributors: [
        { name: "Alice", roles: ["author"] },
        { name: "Bob", roles: ["author"] },
      ],
      publication: {
        edition: {
          publisher: "Acme",
          date: { year: 2024, month: 5, day: 3 },
        },
      },
      languages: ["en"],
      subjects: ["Action", "ninja"],
      belongsTo: { series: [{ name: "Sample Series", position: 1 }] },
      comic: { manga: true },
    })
  })
})
