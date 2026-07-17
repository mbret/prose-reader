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
  publisher: undefined,
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
      }),
    ).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
    })
  })

  it("uses the first ISBN-scheme identifier whose value normalizes", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        identifiers: [
          { scheme: "ISBN", value: "garbage" },
          { scheme: "ISBN", value: "978-3-16-148410-0" },
        ],
      }),
    ).toEqual({
      gtin: "9783161484100",
      isbn: "9783161484100",
    })
  })

  it("forwards title, publisher, rights, languages, subjects, and authors", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        title: "Norwegian Wood",
        creators: ["Haruki Murakami", "Jay Rubin"],
        publisher: "Vintage",
        rights: "Copyright 2024",
        languages: ["en", "ja"],
        subjects: ["Fiction", "Modern Japanese Literature"],
      }),
    ).toEqual({
      title: "Norwegian Wood",
      authors: ["Haruki Murakami", "Jay Rubin"],
      publisher: "Vintage",
      rights: "Copyright 2024",
      languages: ["en", "ja"],
      subjects: ["Fiction", "Modern Japanese Literature"],
    })
  })

  it("omits authors / languages / subjects when the parsed lists are empty", () => {
    expect(
      resolveOpf({
        ...emptyOpf(),
        creators: [],
        languages: [],
        subjects: [],
      }),
    ).toEqual({})
  })

  it("parses W3CDTF dc:date down to year / month / day", () => {
    expect(
      resolveOpf({ ...emptyOpf(), date: "2024-12-25T12:00:00Z" }).date,
    ).toEqual({ year: 2024, month: 12, day: 25 })
  })

  it("preserves a year-only dc:date", () => {
    expect(resolveOpf({ ...emptyOpf(), date: "1997" }).date).toEqual({
      year: 1997,
    })
  })

  it("omits date when dc:date is unparseable", () => {
    expect(resolveOpf({ ...emptyOpf(), date: "sometime in 2024" }).date).toBe(
      undefined,
    )
  })

  it("returns a defensively-copied authors array", () => {
    const creators = ["Alice"]
    const result = resolveOpf({ ...emptyOpf(), creators })

    expect(result.authors).toEqual(["Alice"])
    expect(result.authors).not.toBe(creators)
  })
})
