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
})
