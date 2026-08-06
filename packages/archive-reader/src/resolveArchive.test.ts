import { describe, expect, expectTypeOf, it } from "vitest"
import { createArchive } from "./archives/createArchive"
import { blobFileAccessors } from "./archives/fileAccessors"
import type { ResolvedArchive } from "./resolveArchive"
import { resolveArchive } from "./resolveArchive"

const textRecord = (
  uri: string,
  content = ``,
  { size, encodingFormat }: { size?: number; encodingFormat?: string } = {},
) => ({
  dir: false,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: size ?? content.length,
  ...(encodingFormat !== undefined ? { encodingFormat } : {}),
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
})

const archiveWith = (
  records: ReturnType<typeof textRecord>[],
  filename = `archive`,
) =>
  createArchive({
    filename,
    records,
    close: () => Promise.resolve(),
  })

const xhtml = (viewport: boolean) =>
  `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Page</title>
    ${viewport ? `<meta name="viewport" content="width=1200, height=600" />` : ``}
  </head>
  <body><p>content</p></body>
</html>`

const epubArchive = ({
  layoutMeta = ``,
  viewport = false,
}: {
  layoutMeta?: string
  viewport?: boolean
} = {}) => {
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>My Book</dc:title>
    <dc:creator>Jane Author</dc:creator>
    ${layoutMeta}
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="page2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1"/>
    <itemref idref="p2"/>
  </spine>
</package>`

  return archiveWith(
    [
      textRecord(`OEBPS/content.opf`, opf),
      textRecord(`OEBPS/page1.xhtml`, xhtml(viewport), { size: 100 }),
      textRecord(`OEBPS/page2.xhtml`, xhtml(viewport), { size: 300 }),
    ],
    `book.epub`,
  )
}

describe(`Given an EPUB`, () => {
  it(`should resolve metadata, readingOrder and toc by default, sources excluded`, async () => {
    const resolved = await resolveArchive(epubArchive())

    expect(resolved).toEqual({
      version: 3,
      unreadableSources: [],
      metadata: {
        title: `My Book`,
        titles: [{ value: `My Book` }],
        contributors: [{ name: `Jane Author`, roles: [`author`] }],
      },
      readingOrder: [
        {
          uri: `OEBPS/page1.xhtml`,
          id: `p1`,
          mediaType: `application/xhtml+xml`,
          size: 100,
          progressionWeight: 0.25,
        },
        {
          uri: `OEBPS/page2.xhtml`,
          id: `p2`,
          mediaType: `application/xhtml+xml`,
          size: 300,
          progressionWeight: 0.75,
        },
      ],
      // explicit empty toc: EPUB without nav/NCX
      toc: [],
    })

    expect(`sources` in resolved).toBe(false)
  })

  it(`should project only the requested tokens (plus version)`, async () => {
    const resolved = await resolveArchive(epubArchive(), {
      include: [`sources`],
    })

    expectTypeOf(resolved).toEqualTypeOf<
      Pick<ResolvedArchive, `sources` | `version` | `unreadableSources`>
    >()

    expect(resolved.version).toBe(3)
    expect(resolved.sources.opf?.opf.titles[0]?.value).toBe(`My Book`)
    expect(resolved.sources.opf?.basePath).toBe(`OEBPS`)
    expect(`metadata` in resolved).toBe(false)
    expect(`readingOrder` in resolved).toBe(false)
    expect(`toc` in resolved).toBe(false)
  })

  it(`should be plain JSON (structured-clone-able)`, async () => {
    const resolved = await resolveArchive(epubArchive(), {
      include: [`metadata`, `readingOrder`, `toc`, `sources`],
    })

    expect(structuredClone(resolved)).toEqual(resolved)
  })
})

describe(`Given a projection that needs nothing read from the book`, () => {
  // an OPF record whose bytes are only touched when actually read, so the
  // test can assert the package document is not opened for nothing
  const countingOpf = (content: string) => {
    let reads = 0
    const record = {
      dir: false as const,
      basename: `content.opf`,
      uri: `OEBPS/content.opf`,
      size: content.length,
      ...blobFileAccessors(() => {
        reads += 1
        return Promise.resolve(new Blob([content]))
      }),
    }
    return { record, reads: () => reads }
  }

  it(`should not open the package document for a version-only projection`, async () => {
    const { record, reads } = countingOpf(`<package/>`)

    const resolved = await resolveArchive(archiveWith([record], `book.epub`), {
      include: [`version`],
    })

    // nothing was read, so nothing can be reported broken
    expect(resolved).toEqual({ version: 3, unreadableSources: [] })
    expect(reads()).toBe(0)
  })

  it(`should not open the package document for an empty projection`, async () => {
    const { record, reads } = countingOpf(`<package/>`)

    await resolveArchive(archiveWith([record], `book.epub`), { include: [] })

    expect(reads()).toBe(0)
  })

  it(`should still read the OPF once a book-derived token is requested`, async () => {
    const { record, reads } = countingOpf(
      `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest/><spine/></package>`,
    )

    await resolveArchive(archiveWith([record], `book.epub`), {
      include: [`readingOrder`],
    })

    expect(reads()).toBeGreaterThan(0)
  })
})

describe(`Given an EPUB with a malformed OPF`, () => {
  const malformedOpfArchive = () =>
    archiveWith(
      [
        // mismatched close tag: parseOpf's XmlDocument rejects it, so the
        // orchestrating opf read throws and safeRead returns undefined
        textRecord(
          `OEBPS/content.opf`,
          `<?xml version="1.0"?><package><spine></package>`,
        ),
        textRecord(`OEBPS/page1.xhtml`, xhtml(false), { size: 100 }),
        textRecord(`OEBPS/page2.xhtml`, xhtml(false), { size: 300 }),
      ],
      `book.epub`,
    )

  it(`should swallow the parse error and keep resolving`, async () => {
    const resolved = await resolveArchive(malformedOpfArchive())

    // the malformed OPF contributes no descriptive metadata, and the file
    // listing holds no image (only the .opf and .xhtml docs), so no cover is
    // assumed and there are no pre-paginated pages to count
    expect(resolved.metadata).toEqual({})
    // reading order degrades to the file listing rather than failing the
    // resolve — the whole point of the lenient per-source policy
    expect(resolved.readingOrder.map((item) => item.uri)).toEqual([
      `OEBPS/content.opf`,
      `OEBPS/page1.xhtml`,
      `OEBPS/page2.xhtml`,
    ])
  })

  it(`should report the package document as unreadable`, async () => {
    const resolved = await resolveArchive(malformedOpfArchive())

    // `sources.opf === undefined` cannot say this: a comic archive with no
    // package document at all looks exactly the same there
    expect(resolved.unreadableSources).toEqual([`opf`])
  })

  it(`should report it for a projection that never asks for sources`, async () => {
    const resolved = await resolveArchive(malformedOpfArchive(), {
      include: [`metadata`],
    })

    expect(resolved.unreadableSources).toEqual([`opf`])
  })

  it(`should report an OPF record the package discovery cannot reach`, async () => {
    // carried, well-formed, yet never parsed: OPF discovery matches the
    // lowercase extension only, so nothing reaches the parser and no read
    // throws — the container still declares a package document we cannot use
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`OEBPS/CONTENT.OPF`, `<package/>`),
          textRecord(`OEBPS/page1.xhtml`, xhtml(false), { size: 100 }),
        ],
        `book.epub`,
      ),
    )

    expect(resolved.unreadableSources).toEqual([`opf`])
  })
})

describe(`Given the layoutScan effort modifier`, () => {
  it(`should promote an explicitly-reflowable book whose documents all declare a viewport`, async () => {
    const archive = epubArchive({
      layoutMeta: `<meta property="rendition:layout">reflowable</meta>`,
      viewport: true,
    })

    const withoutScan = await resolveArchive(archive)
    expect(withoutScan.metadata.renditionLayout).toBe(`reflowable`)

    const withScan = await resolveArchive(archive, { layoutScan: true })
    expect(withScan.metadata.renditionLayout).toBe(`pre-paginated`)
    expect(withScan.readingOrder.map((item) => item.renditionLayout)).toEqual([
      `pre-paginated`,
      `pre-paginated`,
    ])
  })

  it(`should not promote when a document lacks the viewport`, async () => {
    const archive = epubArchive({
      layoutMeta: `<meta property="rendition:layout">reflowable</meta>`,
      viewport: false,
    })

    const resolved = await resolveArchive(archive, { layoutScan: true })

    expect(resolved.metadata.renditionLayout).toBe(`reflowable`)
  })

  it(`should not scan a book without an explicit reflowable layout`, async () => {
    const archive = epubArchive({ viewport: true })

    const resolved = await resolveArchive(archive, { layoutScan: true })

    expect(resolved.metadata.renditionLayout).toBeUndefined()
  })

  it(`should promote the reading order even when metadata is not projected`, async () => {
    const archive = epubArchive({
      layoutMeta: `<meta property="rendition:layout">reflowable</meta>`,
      viewport: true,
    })

    const resolved = await resolveArchive(archive, {
      include: [`readingOrder`],
      layoutScan: true,
    })

    expect(resolved.readingOrder.map((item) => item.renditionLayout)).toEqual([
      `pre-paginated`,
      `pre-paginated`,
    ])
  })
})

describe(`Given a CBZ with a ComicInfo sidecar`, () => {
  const comicArchive = (comicInfoContent: string) =>
    archiveWith(
      [
        textRecord(`ComicInfo.xml`, comicInfoContent),
        textRecord(`page_001.jpg`, ``, {
          size: 100,
          encodingFormat: `image/jpeg`,
        }),
        textRecord(`page_002.jpg`, ``, {
          size: 100,
          encodingFormat: `image/jpeg`,
        }),
      ],
      `comic.cbz`,
    )

  it(`should resolve the sidecar into metadata and keep it out of the reading order`, async () => {
    const resolved = await resolveArchive(
      comicArchive(
        `<?xml version="1.0"?><ComicInfo>` +
          `<Title>Vol 1</Title>` +
          `<Series>My Comics</Series>` +
          `<Number>3</Number>` +
          `<Writer>Jane Author</Writer>` +
          `<Manga>YesAndRightToLeft</Manga>` +
          `</ComicInfo>`,
      ),
    )

    expect(resolved.metadata).toEqual({
      title: `Vol 1`,
      titles: [{ value: `Vol 1` }],
      // resolved for the whole archive: the cover is the first page (assumed,
      // the sidecar declared none) and the page count is the image count
      cover: {
        uri: `page_001.jpg`,
        mediaType: `image/jpeg`,
        confidence: `assumed`,
      },
      numberOfPages: 2,
      readingDirection: `rtl`,
      contributors: [{ name: `Jane Author`, roles: [`author`] }],
      belongsTo: { series: [{ name: `My Comics`, position: 3 }] },
      comic: { manga: true },
    })
    expect(resolved.readingOrder).toEqual([
      {
        uri: `page_001.jpg`,
        mediaType: `image/jpeg`,
        size: 100,
        renditionLayout: `pre-paginated`,
        progressionWeight: 0.5,
      },
      {
        uri: `page_002.jpg`,
        mediaType: `image/jpeg`,
        size: 100,
        renditionLayout: `pre-paginated`,
        progressionWeight: 0.5,
      },
    ])
    // flat container: no toc derivable, key absent
    expect(`toc` in resolved).toBe(false)
    // a container carrying no package document at all is not a broken EPUB
    expect(resolved.unreadableSources).toEqual([])
  })

  it(`should swallow a malformed sidecar and keep resolving`, async () => {
    const resolved = await resolveArchive(comicArchive(`not xml`))

    expect(resolved.unreadableSources).toEqual([`comicInfo`])

    // the malformed sidecar contributes no descriptive metadata; the cover
    // and page count still resolve from the container itself
    expect(resolved.metadata).toEqual({
      cover: {
        uri: `page_001.jpg`,
        mediaType: `image/jpeg`,
        confidence: `assumed`,
      },
      numberOfPages: 2,
    })
    expect(resolved.readingOrder).toHaveLength(2)
  })
})

describe(`Given Apple and Kobo flagged containers`, () => {
  it(`should fill the layout from the sidecars, OPF silent`, async () => {
    const archive = archiveWith(
      [
        textRecord(
          `content.opf`,
          `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">` +
            `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Flagged</dc:title></metadata>` +
            `<manifest><item id="p1" href="p1.xhtml" media-type="application/xhtml+xml"/></manifest>` +
            `<spine><itemref idref="p1"/></spine></package>`,
        ),
        textRecord(`p1.xhtml`, xhtml(false)),
        textRecord(
          `META-INF/com.kobobooks.display-options.xml`,
          `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`,
        ),
      ],
      `kobo.epub`,
    )

    const resolved = await resolveArchive(archive)

    expect(resolved.metadata.renditionLayout).toBe(`pre-paginated`)
    expect(resolved.metadata.kobo).toEqual({ fixedLayout: true })
  })
})

describe(`Given a folder comic`, () => {
  it(`should derive the folder toc`, async () => {
    const archive = archiveWith(
      [
        textRecord(`Album/page1.jpg`, ``, {
          size: 1,
          encodingFormat: `image/jpeg`,
        }),
      ],
      `comic.cbz`,
    )

    const resolved = await resolveArchive(archive)

    expect(resolved.toc).toEqual([
      {
        title: `Album`,
        path: `Album/page1.jpg`,
        containerHref: `Album/page1.jpg`,
        contents: [],
      },
    ])
  })
})

describe(`Given the cover in metadata`, () => {
  const epubWithCover = () =>
    archiveWith(
      [
        textRecord(
          `OEBPS/content.opf`,
          `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">` +
            `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>x</dc:title></metadata>` +
            `<manifest>` +
            `<item id="c" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>` +
            `<item id="p1" href="p1.xhtml" media-type="application/xhtml+xml"/>` +
            `</manifest><spine><itemref idref="p1"/></spine></package>`,
        ),
        textRecord(`OEBPS/p1.xhtml`, xhtml(false)),
        textRecord(`OEBPS/cover.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ],
      `book.epub`,
    )

  it(`rides along with metadata in the default projection`, async () => {
    const resolved = await resolveArchive(epubWithCover())

    expect(resolved.metadata.cover).toEqual({
      uri: `OEBPS/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`marks an OPF-declared cover as derived, for a metadata-only projection`, async () => {
    const resolved = await resolveArchive(epubWithCover(), {
      include: [`metadata`],
    })

    expect(resolved.metadata.cover).toEqual({
      uri: `OEBPS/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`falls back to the first page (assumed) for a package-less container`, async () => {
    const archive = archiveWith(
      [
        textRecord(`ComicInfo.xml`, `<?xml version="1.0"?><ComicInfo/>`),
        textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
        textRecord(`page_002.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ],
      `comic.cbz`,
    )

    // metadata-only, no readingOrder token: the fallback still resolves
    // because metadata derives the cover from the container itself
    const resolved = await resolveArchive(archive, { include: [`metadata`] })

    expect(resolved.metadata.cover).toEqual({
      uri: `page_001.jpg`,
      mediaType: `image/jpeg`,
      confidence: `assumed`,
    })
  })
})

describe(`Given the numberOfPages in metadata`, () => {
  const comic = (records: ReturnType<typeof textRecord>[]) =>
    archiveWith(records, `comic.cbz`)

  it(`counts the pre-paginated pages of a package-less container`, async () => {
    const resolved = await resolveArchive(
      comic([
        textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
        textRecord(`page_002.jpg`, ``, { encodingFormat: `image/jpeg` }),
        textRecord(`page_003.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ]),
      { include: [`metadata`] },
    )

    expect(resolved.metadata.numberOfPages).toBe(3)
  })

  it(`prefers a declared ComicInfo PageCount over the counted pages`, async () => {
    const resolved = await resolveArchive(
      comic([
        textRecord(
          `ComicInfo.xml`,
          `<?xml version="1.0"?><ComicInfo><PageCount>48</PageCount></ComicInfo>`,
        ),
        textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
        textRecord(`page_002.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ]),
      { include: [`metadata`] },
    )

    expect(resolved.metadata.numberOfPages).toBe(48)
  })

  it(`leaves it absent for a reflowable EPUB`, async () => {
    const resolved = await resolveArchive(epubArchive(), {
      include: [`metadata`],
    })

    expect(resolved.metadata.numberOfPages).toBeUndefined()
  })

  it(`does not count audio/video tracks as pages`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`track01.mp3`, ``, { encodingFormat: `audio/mpeg` }),
          textRecord(`track02.mp3`, ``, { encodingFormat: `audio/mpeg` }),
        ],
        `audiobook.zip`,
      ),
      { include: [`metadata`] },
    )

    expect(resolved.metadata.numberOfPages).toBeUndefined()
  })

  it(`counts only the page-like items in a mixed archive`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`narration.mp3`, ``, { encodingFormat: `audio/mpeg` }),
          textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
          textRecord(`page_002.jpg`, ``, { encodingFormat: `image/jpeg` }),
        ],
        `mixed.zip`,
      ),
      { include: [`metadata`] },
    )

    expect(resolved.metadata.numberOfPages).toBe(2)
  })
})
