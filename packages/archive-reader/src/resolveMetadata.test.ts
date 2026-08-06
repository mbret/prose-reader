import { describe, expect, it } from "vitest"
import { parseComicInfo } from "./metadata/comicInfo/parse"
import { parseOpf } from "./metadata/opf/parse"
import { resolveMetadata } from "./resolveMetadata"

const opfWrap = (metadata: string) =>
  `<?xml version="1.0"?>` +
  `<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">` +
  `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${metadata}</metadata>` +
  `<manifest/><spine/>` +
  `</package>`

const opfWith = (metadata: string, spineAttributes = ``) =>
  parseOpf(
    `<?xml version="1.0"?>` +
      `<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">` +
      `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">${metadata}</metadata>` +
      `<manifest/><spine ${spineAttributes}/>` +
      `</package>`,
  )

const comicInfoWith = (body: string) =>
  parseComicInfo(`<?xml version="1.0"?><ComicInfo>${body}</ComicInfo>`)

describe("resolveMetadata", () => {
  it("returns an empty result when no source is provided", () => {
    expect(resolveMetadata({})).toEqual({})
  })

  it("resolves a single source as-is", () => {
    expect(
      resolveMetadata({
        comicInfo: comicInfoWith("<Title>Vol 1</Title>"),
      }),
    ).toEqual({ title: "Vol 1", titles: [{ value: "Vol 1" }] })
  })

  it("prefers OPF over ComicInfo for descriptive fields", () => {
    const resolved = resolveMetadata({
      opf: opfWith(
        `<dc:title>Package Title</dc:title>` +
          `<dc:publisher>Package Publisher</dc:publisher>` +
          `<dc:language>en</dc:language>` +
          `<dc:creator>Package Author</dc:creator>`,
      ),
      comicInfo: comicInfoWith(
        `<Title>Sidecar Title</Title>` +
          `<Publisher>Sidecar Publisher</Publisher>` +
          `<LanguageISO>ja</LanguageISO>` +
          `<Writer>Sidecar Author</Writer>`,
      ),
    })

    expect(resolved.title).toBe("Package Title")
    expect(resolved.publication?.edition?.publisher).toBe("Package Publisher")
    expect(resolved.languages).toEqual(["en"])
    expect(resolved.contributors).toEqual([
      { name: "Package Author", roles: ["author"] },
    ])
  })

  it("fills descriptive gaps from ComicInfo when the OPF is silent", () => {
    const resolved = resolveMetadata({
      opf: opfWith(`<dc:title>Package Title</dc:title>`),
      comicInfo: comicInfoWith(`<Summary>From the sidecar.</Summary>`),
    })

    expect(resolved.title).toBe("Package Title")
    expect(resolved.description).toBe("From the sidecar.")
  })

  it("lets ComicInfo beat the OPF reading direction (recorded decision)", () => {
    // Deliberate, matching the historical manifest pipeline: `Manga`
    // outranks `page-progression-direction` even when both are explicit.
    // Flip this expectation on purpose or not at all.
    const resolved = resolveMetadata({
      opf: opfWith(``, `page-progression-direction="ltr"`),
      comicInfo: comicInfoWith(`<Manga>YesAndRightToLeft</Manga>`),
    })

    expect(resolved.readingDirection).toBe("rtl")
  })

  it("falls back to the OPF reading direction when ComicInfo is silent", () => {
    const resolved = resolveMetadata({
      opf: opfWith(``, `page-progression-direction="rtl"`),
      comicInfo: comicInfoWith(`<Title>x</Title>`),
    })

    expect(resolved.readingDirection).toBe("rtl")
  })

  it("ranks renditionLayout OPF > apple > kobo", () => {
    const apple = {
      kind: "apple" as const,
      displayOptions: {
        platform: {
          options: [{ name: "fixed-layout", value: "false" }],
        },
      },
    }
    const kobo = {
      kind: "kobo" as const,
      renditionLayout: "pre-paginated" as const,
    }

    expect(
      resolveMetadata({
        opf: opfWith(`<meta property="rendition:layout">reflowable</meta>`),
        apple,
        kobo,
      }).renditionLayout,
    ).toBe("reflowable")

    expect(
      resolveMetadata({
        apple: {
          ...apple,
          displayOptions: {
            platform: {
              options: [{ name: "fixed-layout", value: "true" }],
            },
          },
        },
        kobo,
      }).renditionLayout,
    ).toBe("pre-paginated")

    // apple present but not fixed-layout → kobo fills
    expect(resolveMetadata({ apple, kobo }).renditionLayout).toBe(
      "pre-paginated",
    )
  })

  it("concatenates identifiers, OPF first", () => {
    const resolved = resolveMetadata({
      opf: opfWith(
        `<dc:identifier id="bookid">urn:uuid:abc</dc:identifier>` +
          `<dc:identifier opf:scheme="ISBN" xmlns:opf="http://www.idpf.org/2007/opf">978-3-16-148410-0</dc:identifier>`,
      ),
      comicInfo: comicInfoWith(`<GTIN>9638-5074</GTIN>`),
    })

    expect(resolved.identifiers).toEqual([
      { value: "urn:uuid:abc", scheme: "Unknown", unique: true },
      { value: "978-3-16-148410-0", scheme: "ISBN" },
      { value: "9638-5074", scheme: "GTIN" },
    ])
  })

  it("resolves typed and URL Google Books identifiers from EPUB 3 metadata", () => {
    const resolved = resolveMetadata({
      opf: opfWith(
        `<dc:identifier id="google-books-id">k028AAAACAAJ</dc:identifier>` +
          `<meta refines="#google-books-id" property="identifier-type">GoogleBooks</meta>` +
          `<dc:identifier>https://books.google.com/books?id=k028AAAACAAJ</dc:identifier>`,
      ),
    })

    expect(resolved.identifiers).toEqual([
      { value: "k028AAAACAAJ", scheme: "GoogleBooks" },
      {
        value: "https://books.google.com/books?id=k028AAAACAAJ",
        scheme: "URL",
      },
    ])
  })

  it("resolves typed and URL Project Gutenberg identifiers from EPUB 3 metadata", () => {
    const resolved = resolveMetadata({
      opf: opfWith(
        `<dc:identifier id="gutenberg-id">78139</dc:identifier>` +
          `<meta refines="#gutenberg-id" property="identifier-type">ProjectGutenberg</meta>` +
          `<dc:identifier>https://www.gutenberg.org/ebooks/78139</dc:identifier>`,
      ),
    })

    expect(resolved.identifiers).toEqual([
      { value: "78139", scheme: "ProjectGutenberg" },
      {
        value: "https://www.gutenberg.org/ebooks/78139",
        scheme: "URL",
      },
    ])
  })

  it("keeps the format-scoped corners from their producers", () => {
    const resolved = resolveMetadata({
      comicInfo: comicInfoWith(`<BlackAndWhite>Yes</BlackAndWhite>`),
      apple: {
        kind: "apple",
        displayOptions: {
          platform: { options: [{ name: "open-to-spread", value: "true" }] },
        },
      },
      kobo: { kind: "kobo", renditionLayout: "pre-paginated" },
    })

    expect(resolved.comic).toEqual({ blackAndWhite: true })
    expect(resolved.apple).toEqual({
      options: [{ name: "open-to-spread", value: "true" }],
    })
    expect(resolved.kobo).toEqual({ fixedLayout: true })
  })

  it("copies the OPF metas into properties", () => {
    const resolved = resolveMetadata({
      opf: opfWith(`<meta name="calibre:rating" content="8"/>`),
    })

    expect(resolved.properties).toEqual([
      { name: "calibre:rating", content: "8" },
    ])
  })

  it("resolves a representative EPUB+ComicInfo book end to end", () => {
    const resolved = resolveMetadata({
      opf: parseOpf(
        opfWrap(
          `<dc:title>My Book</dc:title>` +
            `<dc:creator id="c1">Jane Author</dc:creator>` +
            `<meta refines="#c1" property="role" scheme="marc:relators">aut</meta>` +
            `<meta property="belongs-to-collection" id="s1">My Series</meta>` +
            `<meta refines="#s1" property="collection-type">series</meta>` +
            `<meta refines="#s1" property="group-position">2</meta>` +
            `<meta property="rendition:layout">pre-paginated</meta>`,
        ),
      ),
      comicInfo: comicInfoWith(
        `<Manga>YesAndRightToLeft</Manga><PageCount>32</PageCount>`,
      ),
    })

    expect(resolved).toMatchObject({
      title: "My Book",
      contributors: [{ name: "Jane Author", roles: ["author"] }],
      belongsTo: { series: [{ name: "My Series", position: 2 }] },
      renditionLayout: "pre-paginated",
      readingDirection: "rtl",
      numberOfPages: 32,
      comic: { manga: true },
    })
  })
})
