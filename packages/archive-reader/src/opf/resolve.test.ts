import { describe, expect, it } from "vitest"
import type { OpfMetadata } from "./parse"
import { resolveOpf } from "./resolve"

const emptyOpf = (): OpfMetadata => ({
  kind: "opf",
  manifestItems: [],
  spineRows: [],
  spineTocIdref: undefined,
  identifiers: [],
  title: undefined,
  creators: [],
  contributors: [],
  publisher: undefined,
  description: undefined,
  rights: undefined,
  languages: [],
  subjects: [],
  date: undefined,
  coverHref: undefined,
  renditionLayoutMeta: undefined,
  renditionFlowMeta: undefined,
  renditionSpreadMeta: undefined,
  pageProgressionDirection: undefined,
  guide: [],
  metas: [],
})

describe("resolveOpf", () => {
  it("maps page-progression-direction to readingDirection", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        pageProgressionDirection: "rtl",
      }),
    ).toEqual({ readingDirection: "rtl" })
  })

  it("normalizes case and whitespace for page progression", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        pageProgressionDirection: " LTR ",
      }),
    ).toEqual({ readingDirection: "ltr" })
  })

  it("maps rendition:layout meta to renditionLayout", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        renditionLayoutMeta: "pre-paginated",
      }),
    ).toEqual({ renditionLayout: "pre-paginated" })
  })

  it("maps rendition:flow and rendition:spread metas, validated values only", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        renditionFlowMeta: "scrolled-doc",
        renditionSpreadMeta: "both",
      }),
    ).toEqual({ renditionFlow: "scrolled-doc", renditionSpread: "both" })

    expect(
      resolveOpf({
        ...emptyOpf(),
        renditionFlowMeta: "sideways",
        renditionSpreadMeta: "wide",
      }),
    ).toEqual({})
  })

  it("omits unknown page progression and layout values", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        pageProgressionDirection: "default",
        renditionLayoutMeta: "fixed",
      }),
    ).toEqual({})
  })

  it("empty when no spine or rendition hints", () => {
    expect(resolveOpf(emptyOpf())).toEqual({})
  })

  it("prefers identifier with scheme ISBN for isbn and gtin", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        identifiers: [
          { scheme: "UUID", value: "urn:uuid:abc" },
          { scheme: "ISBN", value: "978-3-16-148410-0" },
        ],
      }),
    ).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
      identifiers: [
        { scheme: "UUID", value: "urn:uuid:abc" },
        { scheme: "ISBN", value: "978-3-16-148410-0" },
      ],
    })
  })

  it("falls back to first identifier value that normalizes as ISBN", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        identifiers: [{ value: "urn:isbn:9783161484100" }],
      }),
    ).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
      identifiers: [{ value: "urn:isbn:9783161484100" }],
    })
  })

  it("ignores ISBN-scheme identifiers that do not normalize, then scans the rest", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        identifiers: [
          { scheme: "ISBN", value: "not-a-real-isbn" },
          { value: "978-3-16-148410-0" },
        ],
      }).isbn,
    ).toBe("9783161484100")
  })

  it("uses the first ISBN-scheme identifier whose value normalizes", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        identifiers: [
          { scheme: "ISBN", value: "garbage" },
          { scheme: "ISBN", value: "978-3-16-148410-0" },
        ],
      }).isbn,
    ).toBe("9783161484100")
  })

  it("forwards title, publisher, description, rights, languages and subjects", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        title: "Norwegian Wood",
        publisher: "Vintage",
        description: "A nostalgic story.",
        rights: "Copyright 2024",
        languages: ["en", "ja"],
        subjects: ["Fiction", "Modern Japanese Literature"],
      }),
    ).toEqual({
      title: "Norwegian Wood",
      publisher: "Vintage",
      description: "A nostalgic story.",
      rights: "Copyright 2024",
      languages: ["en", "ja"],
      subjects: ["Fiction", "Modern Japanese Literature"],
    })
  })

  it("omits contributors / languages / subjects when the parsed lists are empty", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        creators: [],
        contributors: [],
        languages: [],
        subjects: [],
      }),
    ).toEqual({})
  })

  it("maps structured contributors, normalizing common MARC relator codes", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        creators: ["Haruki Murakami"],
        contributors: [
          { name: "Haruki Murakami", source: "creator", roles: ["aut"] },
          { name: "Jay Rubin", source: "contributor", roles: ["trl"] },
          {
            name: "Case Insensitive",
            source: "contributor",
            roles: [" ILL "],
          },
        ],
      }).contributors,
    ).toEqual([
      { name: "Haruki Murakami", roles: ["author"] },
      { name: "Jay Rubin", roles: ["translator"] },
      { name: "Case Insensitive", roles: ["illustrator"] },
    ])
  })

  it("passes unknown role tokens through verbatim", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        contributors: [
          { name: "Someone", source: "contributor", roles: ["dub"] },
        ],
      }).contributors,
    ).toEqual([{ name: "Someone", roles: ["dub"] }])
  })

  it("defaults a role-less creator to author and a role-less contributor to contributor", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        contributors: [
          { name: "Plain Creator", source: "creator", roles: [] },
          { name: "Plain Contributor", source: "contributor", roles: [] },
        ],
      }).contributors,
    ).toEqual([
      { name: "Plain Creator", roles: ["author"] },
      { name: "Plain Contributor", roles: ["contributor"] },
    ])
  })

  it("maps file-as onto sortAs", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        contributors: [
          {
            name: "Haruki Murakami",
            source: "creator",
            roles: ["aut"],
            fileAs: "Murakami, Haruki",
          },
        ],
      }).contributors,
    ).toEqual([
      {
        name: "Haruki Murakami",
        roles: ["author"],
        sortAs: "Murakami, Haruki",
      },
    ])
  })

  it("parses W3CDTF dc:date down to year / month / day", () => {
    expect(
      resolveOpf({ ...emptyOpf(), date: "2024-12-25T12:00:00Z" }).published,
    ).toEqual({ year: 2024, month: 12, day: 25 })
  })

  it("preserves a year-only dc:date", () => {
    expect(resolveOpf({ ...emptyOpf(), date: "1997" }).published).toEqual({
      year: 1997,
    })
  })

  it("omits the published date when dc:date is unparseable", () => {
    expect(
      resolveOpf({ ...emptyOpf(), date: "sometime in 2024" }).published,
    ).toBe(undefined)
  })

  it("maps belongs-to-collection metas into belongsTo, series versus collection", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        metas: [
          { property: "belongs-to-collection", id: "s1", value: "My Series" },
          { property: "collection-type", refines: "#s1", value: "series" },
          { property: "group-position", refines: "#s1", value: "3" },
          { property: "belongs-to-collection", id: "c1", value: "My Set" },
        ],
      }).belongsTo,
    ).toEqual({
      series: [{ name: "My Series", position: 3 }],
      collection: [{ name: "My Set" }],
    })
  })

  it("falls back to calibre series metas when no EPUB 3 series exists", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        metas: [
          { name: "calibre:series", content: "My Series" },
          { name: "calibre:series_index", content: "2.5" },
        ],
      }).belongsTo,
    ).toEqual({
      series: [{ name: "My Series", position: 2.5 }],
    })
  })

  it("prefers EPUB 3 series over the calibre pair", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        metas: [
          { property: "belongs-to-collection", id: "s1", value: "Epub Series" },
          { property: "collection-type", refines: "#s1", value: "series" },
          { name: "calibre:series", content: "Calibre Series" },
        ],
      }).belongsTo,
    ).toEqual({
      series: [{ name: "Epub Series" }],
    })
  })

  it("copies every meta verbatim into properties", () => {
    const metas = [
      { property: "dcterms:modified", value: "2024-01-01T00:00:00Z" },
      { name: "calibre:rating", content: "8" },
    ]

    const resolved = resolveOpf({ ...emptyOpf(), metas })

    expect(resolved.properties).toEqual(metas)
    expect(resolved.properties).not.toBe(metas)
  })

  it("returns defensively-copied arrays", () => {
    const languages = ["en"]
    const result = resolveOpf({ ...emptyOpf(), languages })

    expect(result.languages).toEqual(["en"])
    expect(result.languages).not.toBe(languages)
  })
})
