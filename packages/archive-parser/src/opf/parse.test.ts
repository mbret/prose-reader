import { describe, expect, it } from "vitest"
import type { OpfMetadata } from "./parse"
import { parseOpf } from "./parse"

const opfWrap = (body: string) =>
  `<?xml version="1.0"?>` +
  `<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">` +
  body +
  `</package>`

const noPackageMetadata: Pick<
  OpfMetadata,
  | "identifiers"
  | "title"
  | "renditionLayoutMeta"
  | "renditionFlowMeta"
  | "renditionSpreadMeta"
  | "pageProgressionDirection"
  | "spineTocIdref"
  | "guide"
> = {
  identifiers: [],
  title: undefined,
  renditionLayoutMeta: undefined,
  renditionFlowMeta: undefined,
  renditionSpreadMeta: undefined,
  pageProgressionDirection: undefined,
  spineTocIdref: undefined,
  guide: [],
}

describe("parseOpf", () => {
  it("returns manifest items and spine rows in spine order", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="a" href="a.xhtml" media-type="application/xhtml+xml"/>` +
        `<item id="b" href="b.xhtml" media-type="application/xhtml+xml"/>` +
        `<item id="c" href="c.xhtml" media-type="application/xhtml+xml"/>` +
        `</manifest>` +
        `<spine>` +
        `<itemref idref="c"/>` +
        `<itemref idref="a"/>` +
        `</spine>`,
    )

    expect(parseOpf(xml)).toEqual({
      kind: "opf",
      manifestItems: [
        { id: "a", href: "a.xhtml", mediaType: "application/xhtml+xml" },
        { id: "b", href: "b.xhtml", mediaType: "application/xhtml+xml" },
        { id: "c", href: "c.xhtml", mediaType: "application/xhtml+xml" },
      ],
      spineRows: [
        {
          idref: "c",
          id: "c",
          href: "c.xhtml",
          mediaType: "application/xhtml+xml",
        },
        {
          idref: "a",
          id: "a",
          href: "a.xhtml",
          mediaType: "application/xhtml+xml",
        },
      ],
      ...noPackageMetadata,
    })
  })

  it("returns empty manifest and spine when roots are missing", () => {
    expect(parseOpf(opfWrap(`<manifest/>`))).toEqual({
      kind: "opf",
      manifestItems: [],
      spineRows: [],
      ...noPackageMetadata,
    })
    expect(parseOpf(opfWrap(`<spine/>`))).toEqual({
      kind: "opf",
      manifestItems: [],
      spineRows: [],
      ...noPackageMetadata,
    })
  })

  it("still lists manifest items when spine is absent", () => {
    const xml = opfWrap(`<manifest><item id="x" href="x.xhtml"/></manifest>`)
    expect(parseOpf(xml)).toEqual({
      kind: "opf",
      manifestItems: [{ id: "x", href: "x.xhtml" }],
      spineRows: [],
      ...noPackageMetadata,
    })
  })

  it("skips itemref without idref or unknown idref", () => {
    const xml = opfWrap(
      `<manifest><item id="x" href="x.xhtml"/></manifest>` +
        `<spine><itemref/><itemref idref="missing"/><itemref idref="x"/></spine>`,
    )

    expect(parseOpf(xml)).toEqual({
      kind: "opf",
      manifestItems: [{ id: "x", href: "x.xhtml" }],
      spineRows: [{ idref: "x", id: "x", href: "x.xhtml" }],
      ...noPackageMetadata,
    })
  })

  it("parses itemref properties into spine row hints", () => {
    const xml = opfWrap(
      `<manifest><item id="x" href="x.xhtml"/></manifest>` +
        `<spine><itemref idref="x" properties="rendition:layout-pre-paginated page-spread-left"/></spine>`,
    )

    expect(parseOpf(xml).spineRows).toEqual([
      {
        idref: "x",
        id: "x",
        href: "x.xhtml",
        renditionLayout: `pre-paginated`,
        pageSpreadLeft: true,
      },
    ])
  })

  it("records metadata, identifiers, and guide", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">` +
        `<dc:title>My Book</dc:title>` +
        `<meta property="rendition:layout">pre-paginated</meta>` +
        `<meta property="rendition:flow">paginated</meta>` +
        `<meta property="rendition:spread">both</meta>` +
        `<dc:identifier opf:scheme="ISBN">978-3-16-148410-0</dc:identifier>` +
        `</metadata>` +
        `<manifest><item id="x" href="x.xhtml"/></manifest>` +
        `<spine page-progression-direction="rtl"><itemref idref="x"/></spine>` +
        `<guide><reference href="cover.xhtml" title="Cover" type="cover"/></guide>`,
    )

    expect(parseOpf(xml)).toEqual({
      kind: "opf",
      manifestItems: [{ id: "x", href: "x.xhtml" }],
      spineRows: [{ idref: "x", id: "x", href: "x.xhtml" }],
      identifiers: [{ scheme: "ISBN", value: "978-3-16-148410-0" }],
      title: "My Book",
      renditionLayoutMeta: "pre-paginated",
      renditionFlowMeta: "paginated",
      renditionSpreadMeta: "both",
      pageProgressionDirection: "rtl",
      spineTocIdref: undefined,
      guide: [{ href: "cover.xhtml", title: "Cover", type: "cover" }],
    })
  })

  it("records manifest item properties and spine toc idref", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>` +
        `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>` +
        `</manifest>` +
        `<spine toc="ncx"><itemref idref="nav"/></spine>`,
    )

    expect(parseOpf(xml)).toEqual({
      ...noPackageMetadata,
      kind: "opf",
      manifestItems: [
        {
          id: "nav",
          href: "nav.xhtml",
          mediaType: "application/xhtml+xml",
          properties: "nav",
        },
        {
          id: "ncx",
          href: "toc.ncx",
          mediaType: "application/x-dtbncx+xml",
        },
      ],
      spineRows: [
        {
          idref: "nav",
          id: "nav",
          href: "nav.xhtml",
          mediaType: "application/xhtml+xml",
          properties: "nav",
        },
      ],
      spineTocIdref: "ncx",
    })
  })
})
