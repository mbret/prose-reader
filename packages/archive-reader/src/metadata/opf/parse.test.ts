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
  | "titles"
  | "creators"
  | "contributors"
  | "publisher"
  | "description"
  | "rights"
  | "languages"
  | "subjects"
  | "date"
  | "coverHref"
  | "renditionLayoutMeta"
  | "renditionFlowMeta"
  | "renditionSpreadMeta"
  | "pageProgressionDirection"
  | "spineTocIdref"
  | "guide"
  | "metas"
> = {
  identifiers: [],
  titles: [],
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
  spineTocIdref: undefined,
  guide: [],
  metas: [],
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
        `<spine><itemref idref="x" properties="rendition:layout-pre-paginated rendition:flow-paginated page-spread-left"/></spine>`,
    )

    expect(parseOpf(xml).spineRows).toEqual([
      {
        idref: "x",
        id: "x",
        href: "x.xhtml",
        renditionLayout: `pre-paginated`,
        renditionFlow: `paginated`,
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
      ...noPackageMetadata,
      kind: "opf",
      manifestItems: [{ id: "x", href: "x.xhtml" }],
      spineRows: [{ idref: "x", id: "x", href: "x.xhtml" }],
      identifiers: [{ scheme: "ISBN", value: "978-3-16-148410-0" }],
      titles: [{ value: "My Book" }],
      renditionLayoutMeta: "pre-paginated",
      renditionFlowMeta: "paginated",
      renditionSpreadMeta: "both",
      pageProgressionDirection: "rtl",
      guide: [{ href: "cover.xhtml", title: "Cover", type: "cover" }],
      metas: [
        { property: "rendition:layout", value: "pre-paginated" },
        { property: "rendition:flow", value: "paginated" },
        { property: "rendition:spread", value: "both" },
      ],
    })
  })

  it("keeps every dc:title in document order with the ids refinements target", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:title id="t1">Dune</dc:title>` +
        `<dc:title id="t2">  A Novel  </dc:title>` +
        `<dc:title>   </dc:title>` +
        `<dc:title>Untagged</dc:title>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).titles).toEqual([
      { value: "Dune", id: "t1" },
      { value: "A Novel", id: "t2" },
      { value: "Untagged" },
    ])
  })

  it("keeps every identifier and marks the package unique identifier", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:identifier>url:http://www.gutenberg.org/78139</dc:identifier>` +
        `<dc:identifier>calibre:21</dc:identifier>` +
        `<dc:identifier>uuid:5438f78b-6008-42d6-9e9a-eef8b06fd79b</dc:identifier>` +
        `<dc:identifier id="bookid">http://www.gutenberg.org/78139</dc:identifier>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).identifiers).toEqual([
      { value: "url:http://www.gutenberg.org/78139" },
      { value: "calibre:21" },
      { value: "uuid:5438f78b-6008-42d6-9e9a-eef8b06fd79b" },
      {
        id: "bookid",
        unique: true,
        value: "http://www.gutenberg.org/78139",
      },
    ])
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

  it("does not resolve spine direction when page-progression-direction uses a prefixed attribute name", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf" xmlns:p="http://www.idpf.org/2007/opf">` +
      `<manifest><item id="x" href="x.xhtml"/></manifest>` +
      `<spine p:page-progression-direction="rtl"><itemref idref="x"/></spine>` +
      `</package>`

    const parsed = parseOpf(xml)
    expect(parsed.pageProgressionDirection).toBeUndefined()
    expect(parsed.spineRows).toEqual([{ idref: "x", id: "x", href: "x.xhtml" }])
  })

  it("uses the last manifest item when duplicate item ids appear", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="x" href="first.xhtml" media-type="application/xhtml+xml"/>` +
        `<item id="x" href="second.xhtml" media-type="application/xhtml+xml"/>` +
        `</manifest>` +
        `<spine><itemref idref="x"/></spine>`,
    )

    expect(parseOpf(xml)).toEqual({
      kind: "opf",
      manifestItems: [
        { id: "x", href: "first.xhtml", mediaType: "application/xhtml+xml" },
        { id: "x", href: "second.xhtml", mediaType: "application/xhtml+xml" },
      ],
      spineRows: [
        {
          idref: "x",
          id: "x",
          href: "second.xhtml",
          mediaType: "application/xhtml+xml",
        },
      ],
      ...noPackageMetadata,
    })
  })

  it("matches package children by local name when roots use a namespace prefix", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf" xmlns:p="http://www.idpf.org/2007/opf">` +
      `<p:metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<dc:title>Prefixed roots</dc:title>` +
      `<p:meta property="rendition:layout">reflowable</p:meta>` +
      `</p:metadata>` +
      `<p:manifest>` +
      `<p:item id="x" href="x.xhtml" media-type="application/xhtml+xml"/>` +
      `</p:manifest>` +
      `<p:spine toc="ncx">` +
      `<p:itemref idref="x"/>` +
      `</p:spine>` +
      `<p:guide>` +
      `<p:reference href="c.xhtml" title="Cover" type="cover"/>` +
      `</p:guide>` +
      `</package>`

    expect(parseOpf(xml)).toEqual({
      ...noPackageMetadata,
      kind: "opf",
      manifestItems: [
        { id: "x", href: "x.xhtml", mediaType: "application/xhtml+xml" },
      ],
      spineRows: [
        {
          idref: "x",
          id: "x",
          href: "x.xhtml",
          mediaType: "application/xhtml+xml",
        },
      ],
      titles: [{ value: "Prefixed roots" }],
      renditionLayoutMeta: "reflowable",
      spineTocIdref: "ncx",
      guide: [{ href: "c.xhtml", title: "Cover", type: "cover" }],
      metas: [{ property: "rendition:layout", value: "reflowable" }],
    })
  })
})

describe("parseOpf — Dublin Core fields", () => {
  it("collects every dc:creator in document order", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator>Haruki Murakami</dc:creator>` +
        `<dc:creator>Jay Rubin</dc:creator>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).creators).toEqual(["Haruki Murakami", "Jay Rubin"])
  })

  it("trims and drops empty dc:creator values", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator>  Haruki Murakami  </dc:creator>` +
        `<dc:creator>   </dc:creator>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).creators).toEqual(["Haruki Murakami"])
  })

  it("returns the first non-empty dc:publisher", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:publisher>Vintage</dc:publisher>` +
        `<dc:publisher>Other</dc:publisher>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).publisher).toBe("Vintage")
  })

  it("returns the first non-empty dc:rights", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:rights>Copyright 2024</dc:rights>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).rights).toBe("Copyright 2024")
  })

  it("collects every dc:language in document order, preserving BCP 47 tags", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:language>zh-Hant</dc:language>` +
        `<dc:language>zh-Hans</dc:language>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).languages).toEqual(["zh-Hant", "zh-Hans"])
  })

  it("collects every dc:subject in document order", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:subject>Fiction</dc:subject>` +
        `<dc:subject>Romance</dc:subject>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).subjects).toEqual(["Fiction", "Romance"])
  })

  it("returns the first non-empty dc:date raw, preserving the W3CDTF literal", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:date>2024-12-25T12:00:00Z</dc:date>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).date).toBe("2024-12-25T12:00:00Z")
  })

  it("matches Dublin Core tags by local name when the prefix is unconventional", () => {
    const xml = opfWrap(
      `<metadata xmlns:dcterms="http://purl.org/dc/terms/">` +
        `<dcterms:publisher>Acme</dcterms:publisher>` +
        `<dcterms:creator>Alice</dcterms:creator>` +
        `</metadata>`,
    )

    const parsed = parseOpf(xml)
    expect(parsed.publisher).toBe("Acme")
    expect(parsed.creators).toEqual(["Alice"])
  })

  it("returns empty / undefined defaults when metadata is absent", () => {
    expect(parseOpf(opfWrap(""))).toMatchObject({
      creators: [],
      publisher: undefined,
      rights: undefined,
      languages: [],
      subjects: [],
      date: undefined,
    })
  })
})

describe("parseOpf — cover image resolution", () => {
  it("resolves coverHref via the EPUB 3 cover-image manifest property", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="ci" href="images/cover.svg" media-type="image/svg+xml" properties="cover-image"/>` +
        `<item id="other" href="images/page.png" media-type="image/png"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBe("images/cover.svg")
  })

  it("matches cover-image even when bundled with other space-separated properties", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="ci" href="cover.png" media-type="image/png" properties="svg cover-image scripted"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBe("cover.png")
  })

  it("ignores cover-image on a non-image manifest item even when an unrelated image exists", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="x" href="cover.xhtml" media-type="application/xhtml+xml" properties="cover-image"/>` +
        `<item id="img" href="page.png" media-type="image/png"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBeUndefined()
  })

  it('falls back to the EPUB 2 <meta name="cover"> convention', () => {
    const xml = opfWrap(
      `<metadata>` +
        `<meta name="cover" content="cover-img"/>` +
        `</metadata>` +
        `<manifest>` +
        `<item id="cover-img" href="cover.jpg" media-type="image/jpeg"/>` +
        `<item id="other" href="page.png" media-type="image/png"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBe("cover.jpg")
  })

  it("prefers the EPUB 3 cover-image property over the EPUB 2 meta convention", () => {
    const xml = opfWrap(
      `<metadata>` +
        `<meta name="cover" content="legacy-cover"/>` +
        `</metadata>` +
        `<manifest>` +
        `<item id="legacy-cover" href="legacy.jpg" media-type="image/jpeg"/>` +
        `<item id="ci" href="modern.png" media-type="image/png" properties="cover-image"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBe("modern.png")
  })

  it("falls back to a manifest item whose id contains 'cover'", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="page-1" href="p1.jpg" media-type="image/jpeg"/>` +
        `<item id="my-cover" href="cv.jpg" media-type="image/jpeg"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBe("cv.jpg")
  })

  it("returns coverHref undefined when the manifest has no image candidate", () => {
    const xml = opfWrap(
      `<manifest>` +
        `<item id="page-1" href="p1.xhtml" media-type="application/xhtml+xml"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBeUndefined()
  })

  it("returns coverHref undefined when there is no manifest at all", () => {
    expect(parseOpf(opfWrap("")).coverHref).toBeUndefined()
  })

  it('ignores a meta name="cover" pointing at a non-image manifest item', () => {
    const xml = opfWrap(
      `<metadata>` +
        `<meta name="cover" content="cover-id"/>` +
        `</metadata>` +
        `<manifest>` +
        `<item id="cover-id" href="cover.xhtml" media-type="application/xhtml+xml"/>` +
        `<item id="other" href="page.png" media-type="image/png"/>` +
        `</manifest>`,
    )

    expect(parseOpf(xml).coverHref).toBeUndefined()
  })
})

describe("parseOpf — contributors", () => {
  it("captures EPUB 2 style roles and file-as from attributes", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">` +
        `<dc:creator opf:role="aut" opf:file-as="Murakami, Haruki">Haruki Murakami</dc:creator>` +
        `<dc:contributor opf:role="ill">Anzai Mizumaru</dc:contributor>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).contributors).toEqual([
      {
        name: "Haruki Murakami",
        source: "creator",
        roles: ["aut"],
        fileAs: "Murakami, Haruki",
      },
      { name: "Anzai Mizumaru", source: "contributor", roles: ["ill"] },
    ])
  })

  it("captures EPUB 3 refines roles and file-as, in document order", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator id="creator01">Jane Author</dc:creator>` +
        `<meta refines="#creator01" property="role" scheme="marc:relators">aut</meta>` +
        `<meta refines="#creator01" property="role" scheme="marc:relators">ill</meta>` +
        `<meta refines="#creator01" property="file-as">Author, Jane</meta>` +
        `<meta refines="#creator01" property="display-seq">1</meta>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).contributors).toEqual([
      {
        name: "Jane Author",
        source: "creator",
        id: "creator01",
        roles: ["aut", "ill"],
        fileAs: "Author, Jane",
      },
    ])
  })

  it("prefers the attribute role/file-as and appends refines roles", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">` +
        `<dc:creator id="c1" opf:role="aut" opf:file-as="A">Name</dc:creator>` +
        `<meta refines="#c1" property="role">ill</meta>` +
        `<meta refines="#c1" property="file-as">B</meta>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).contributors).toEqual([
      {
        name: "Name",
        source: "creator",
        id: "c1",
        roles: ["aut", "ill"],
        fileAs: "A",
      },
    ])
  })

  it("keeps entries without any role and drops empty names", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator>Plain Author</dc:creator>` +
        `<dc:contributor>   </dc:contributor>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).contributors).toEqual([
      { name: "Plain Author", source: "creator", roles: [] },
    ])
  })

  it("does not attach refines from other ids", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:creator id="c1">One</dc:creator>` +
        `<dc:creator id="c2">Two</dc:creator>` +
        `<meta refines="#c2" property="role">ill</meta>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).contributors).toEqual([
      { name: "One", source: "creator", id: "c1", roles: [] },
      { name: "Two", source: "creator", id: "c2", roles: ["ill"] },
    ])
  })
})

describe("parseOpf — generic meta capture", () => {
  it("captures every meta element verbatim, whatever its shape", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>` +
        `<meta property="belongs-to-collection" id="series01">My Series</meta>` +
        `<meta refines="#series01" property="collection-type">series</meta>` +
        `<meta refines="#series01" property="group-position">3</meta>` +
        `<meta name="calibre:series" content="My Series"/>` +
        `<meta name="calibre:series_index" content="3"/>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).metas).toEqual([
      { property: "dcterms:modified", value: "2024-01-01T00:00:00Z" },
      {
        property: "belongs-to-collection",
        id: "series01",
        value: "My Series",
      },
      {
        property: "collection-type",
        refines: "#series01",
        value: "series",
      },
      {
        property: "group-position",
        refines: "#series01",
        value: "3",
      },
      { name: "calibre:series", content: "My Series" },
      { name: "calibre:series_index", content: "3" },
    ])
  })

  it("drops fully empty meta elements and trims fields", () => {
    const xml = opfWrap(
      `<metadata>` +
        `<meta/>` +
        `<meta property="  spaced  ">  spaced value  </meta>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).metas).toEqual([
      { property: "spaced", value: "spaced value" },
    ])
  })
})

describe("parseOpf — description", () => {
  it("returns the first non-empty dc:description", () => {
    const xml = opfWrap(
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">` +
        `<dc:description>  </dc:description>` +
        `<dc:description>A story about tests.</dc:description>` +
        `</metadata>`,
    )

    expect(parseOpf(xml).description).toBe("A story about tests.")
  })
})

describe("OPF namespace prefix aliases", () => {
  const packaged = (packageAttrs: string, metadata: string) =>
    `<?xml version="1.0"?>` +
    `<package version="3.0" unique-identifier="bookid"` +
    ` xmlns="http://www.idpf.org/2007/opf"` +
    ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
    ` ${packageAttrs}>` +
    `<metadata>${metadata}</metadata><manifest/><spine/>` +
    `</package>`

  it("reads a scheme stated under another prefix bound to the OPF namespace", () => {
    const xml = packaged(
      'xmlns:pkg="http://www.idpf.org/2007/opf"',
      '<dc:identifier pkg:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([
      { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
    ])
  })

  it("ignores the same local name under a prefix bound elsewhere", () => {
    const xml = packaged(
      'xmlns:other="http://example.com/not-opf"',
      '<dc:identifier other:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([{ value: "zyTCAlFPjgYC" }])
  })

  it("still reads the conventional prefix a package left undeclared", () => {
    const xml = packaged(
      'id="pkg"',
      '<dc:identifier opf:scheme="ISBN">9783161484100</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([
      { value: "9783161484100", scheme: "ISBN" },
    ])
  })

  it("reads a role and a sort name under an aliased prefix", () => {
    const xml = packaged(
      'xmlns:pkg="http://www.idpf.org/2007/opf"',
      '<dc:creator pkg:role="ill" pkg:file-as="Murakami, Haruki">Haruki Murakami</dc:creator>',
    )

    expect(parseOpf(xml).contributors).toEqual([
      {
        name: "Haruki Murakami",
        source: "creator",
        roles: ["ill"],
        fileAs: "Murakami, Haruki",
      },
    ])
  })

  it("keeps reading the unprefixed EPUB 2 spellings", () => {
    const xml = packaged(
      'id="pkg"',
      '<dc:identifier scheme="ISBN">9783161484100</dc:identifier>' +
        '<dc:creator role="aut" file-as="Murakami, Haruki">Haruki Murakami</dc:creator>',
    )
    const parsed = parseOpf(xml)

    expect(parsed.identifiers).toEqual([
      { value: "9783161484100", scheme: "ISBN" },
    ])
    expect(parsed.contributors[0]).toMatchObject({
      roles: ["aut"],
      fileAs: "Murakami, Haruki",
    })
  })
})

describe("OPF namespace bindings declared below the package element", () => {
  const withMetadata = (metadataAttrs: string, metadata: string) =>
    `<?xml version="1.0"?>` +
    `<package version="3.0" unique-identifier="bookid"` +
    ` xmlns="http://www.idpf.org/2007/opf"` +
    ` xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<metadata ${metadataAttrs}>${metadata}</metadata><manifest/><spine/>` +
    `</package>`

  it("reads a prefix declared on the metadata element", () => {
    const xml = withMetadata(
      'xmlns:pkg="http://www.idpf.org/2007/opf"',
      '<dc:identifier pkg:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([
      { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
    ])
  })

  it("reads a prefix declared on the identifier itself", () => {
    const xml = withMetadata(
      "",
      '<dc:identifier xmlns:pkg="http://www.idpf.org/2007/opf" pkg:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([
      { value: "zyTCAlFPjgYC", scheme: "GoogleBooks" },
    ])
  })

  it("reads a prefix declared on a creator itself", () => {
    const xml = withMetadata(
      "",
      '<dc:creator xmlns:pkg="http://www.idpf.org/2007/opf" pkg:role="ill">Haruki Murakami</dc:creator>',
    )

    expect(parseOpf(xml).contributors).toEqual([
      { name: "Haruki Murakami", source: "creator", roles: ["ill"] },
    ])
  })

  it("honours a descendant rebinding the conventional prefix elsewhere", () => {
    const xml = withMetadata(
      'xmlns:opf="http://example.com/not-opf"',
      '<dc:identifier opf:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>',
    )

    expect(parseOpf(xml).identifiers).toEqual([{ value: "zyTCAlFPjgYC" }])
  })

  it("honours a descendant rebinding an aliased prefix elsewhere", () => {
    const xml =
      `<?xml version="1.0"?>` +
      `<package version="3.0" unique-identifier="bookid"` +
      ` xmlns="http://www.idpf.org/2007/opf"` +
      ` xmlns:dc="http://purl.org/dc/elements/1.1/"` +
      ` xmlns:pkg="http://www.idpf.org/2007/opf">` +
      `<metadata xmlns:pkg="http://example.com/not-opf">` +
      '<dc:identifier pkg:scheme="GoogleBooks">zyTCAlFPjgYC</dc:identifier>' +
      `</metadata><manifest/><spine/></package>`

    expect(parseOpf(xml).identifiers).toEqual([{ value: "zyTCAlFPjgYC" }])
  })
})
