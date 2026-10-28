import { describe, expect, expectTypeOf, it } from "vitest"
import { createArchive } from "./archives/createArchive"
import { createArchiveFromUrls } from "./archives/createArchiveFromUrls"
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
      version: 5,
      mediaType: `application/epub+zip`,
      unreadableSources: [],
      metadata: {
        titles: [{ value: `My Book` }],
        contributors: [{ name: `Jane Author`, roles: [`author`] }],
      },
      readingOrder: [
        {
          uri: `OEBPS/page1.xhtml`,
          containerHref: `OEBPS/page1.xhtml`,
          id: `p1`,
          mediaType: `application/xhtml+xml`,
          size: 100,
          progressionWeight: 0.25,
        },
        {
          uri: `OEBPS/page2.xhtml`,
          containerHref: `OEBPS/page2.xhtml`,
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
      Pick<
        ResolvedArchive,
        `sources` | `version` | `mediaType` | `unreadableSources`
      >
    >()

    expect(resolved.version).toBe(5)
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

describe(`Given an EPUB whose package document escapes its hrefs`, () => {
  // An href is a URL, so it escapes a space or a non-ASCII letter of the
  // file name it references.
  const opf = (hrefs: { chapters: string[]; cover?: string }) =>
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">` +
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>x</dc:title></metadata>` +
    `<manifest>` +
    (hrefs.cover === undefined
      ? ``
      : `<item id="c" href="${hrefs.cover}" media-type="image/jpeg" properties="cover-image"/>`) +
    hrefs.chapters
      .map(
        (href, index) =>
          `<item id="p${index}" href="${href}" media-type="application/xhtml+xml"/>`,
      )
      .join(``) +
    `</manifest><spine>` +
    hrefs.chapters.map((_, index) => `<itemref idref="p${index}"/>`).join(``) +
    `</spine></package>`

  it(`each spine item and the cover are the record their href names, and a spine item keeps the href`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(
            `OEBPS/content.opf`,
            opf({
              chapters: [`Text/Chapter%201.xhtml`, `Text/%C3%89pilogue.xhtml`],
              cover: `Images/Cover%20Art.jpg`,
            }),
          ),
          textRecord(`OEBPS/Text/Chapter 1.xhtml`, xhtml(false), { size: 100 }),
          textRecord(`OEBPS/Text/Épilogue.xhtml`, xhtml(false), { size: 300 }),
          textRecord(`OEBPS/Images/Cover Art.jpg`, ``, {
            encodingFormat: `image/jpeg`,
          }),
        ],
        `book.epub`,
      ),
    )

    // the records' sizes weigh the chapters
    expect(
      resolved.readingOrder.map(
        ({ uri, containerHref, progressionWeight }) => ({
          uri,
          containerHref,
          progressionWeight,
        }),
      ),
    ).toEqual([
      {
        uri: `OEBPS/Text/Chapter 1.xhtml`,
        containerHref: `OEBPS/Text/Chapter%201.xhtml`,
        progressionWeight: 0.25,
      },
      {
        uri: `OEBPS/Text/Épilogue.xhtml`,
        containerHref: `OEBPS/Text/%C3%89pilogue.xhtml`,
        progressionWeight: 0.75,
      },
    ])
    expect(resolved.metadata.cover).toEqual({
      uri: `OEBPS/Images/Cover Art.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`an href with a bare percent sign, no URL, still names its record as written`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`OEBPS/content.opf`, opf({ chapters: [`100%.xhtml`] })),
          textRecord(`OEBPS/100%.xhtml`, xhtml(false)),
        ],
        `book.epub`,
      ),
    )

    expect(resolved.readingOrder.map(({ uri }) => uri)).toEqual([
      `OEBPS/100%.xhtml`,
    ])
  })
})

describe(`Given a table of contents in another folder than its chapters`, () => {
  // As sous-le-vent.epub lays its nav out: the links climb out of the
  // navigation folder, one with escaped dots, which a URL parser reads alike.
  const opf = (toc: { nav: string } | { ncx: string }) =>
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">` +
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>x</dc:title></metadata>` +
    `<manifest>` +
    (`nav` in toc
      ? `<item id="toc" href="${toc.nav}" media-type="application/xhtml+xml" properties="nav"/>`
      : `<item id="toc" href="${toc.ncx}" media-type="application/x-dtbncx+xml"/>`) +
    `<item id="c1" href="Content/chapter1.xhtml" media-type="application/xhtml+xml"/>` +
    `<item id="c2" href="Content/chapter2.xhtml" media-type="application/xhtml+xml"/>` +
    `</manifest><spine${`ncx` in toc ? ` toc="toc"` : ``}>` +
    `<itemref idref="c1"/><itemref idref="c2"/></spine></package>`

  const nav =
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>` +
    `<nav epub:type="toc"><ol>` +
    `<li><a href="../Content/chapter1.xhtml">Chapter 1</a>` +
    `<ol><li><a href="../Content/chapter1.xhtml#s1">Section 1.1</a></li></ol></li>` +
    `<li><a href="%2E%2E/Content/chapter2.xhtml">Chapter 2</a></li>` +
    `</ol></nav></body></html>`

  const ncx =
    `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>` +
    `<navPoint id="n1"><navLabel><text>Chapter 1</text></navLabel><content src="../Content/chapter1.xhtml"/>` +
    `<navPoint id="n2"><navLabel><text>Section 1.1</text></navLabel><content src="../Content/chapter1.xhtml#s1"/></navPoint></navPoint>` +
    `<navPoint id="n3"><navLabel><text>Chapter 2</text></navLabel><content src="%2E%2E/Content/chapter2.xhtml"/></navPoint>` +
    `</navMap></ncx>`

  const getTocContainerHrefs = (toc: ResolvedArchive[`toc`]): string[] =>
    (toc ?? []).flatMap((entry) => [
      entry.containerHref,
      ...getTocContainerHrefs(entry.contents),
    ])

  it.each([
    [
      `nav document`,
      textRecord(`EPUB/package.opf`, opf({ nav: `Navigation/nav.xhtml` })),
      textRecord(`EPUB/Navigation/nav.xhtml`, nav),
    ],
    [
      `NCX`,
      textRecord(`EPUB/package.opf`, opf({ ncx: `Navigation/toc.ncx` })),
      textRecord(`EPUB/Navigation/toc.ncx`, ncx),
    ],
  ])(
    `each entry of its %s names its chapter as the spine does`,
    async (_, opfRecord, tocRecord) => {
      const resolved = await resolveArchive(
        archiveWith(
          [
            opfRecord,
            tocRecord,
            textRecord(`EPUB/Content/chapter1.xhtml`, xhtml(false)),
            textRecord(`EPUB/Content/chapter2.xhtml`, xhtml(false)),
          ],
          `book.epub`,
        ),
      )

      expect(getTocContainerHrefs(resolved.toc)).toEqual([
        `EPUB/Content/chapter1.xhtml`,
        `EPUB/Content/chapter1.xhtml#s1`,
        `EPUB/Content/chapter2.xhtml`,
      ])

      // the spine item each entry points to spells the same href
      const spineHrefs = resolved.readingOrder.map(
        ({ containerHref }) => containerHref,
      )
      for (const containerHref of getTocContainerHrefs(resolved.toc)) {
        expect(spineHrefs).toContain(containerHref.split(`#`)[0])
      }
    },
  )

  it(`an NCX entry without content names no target`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`EPUB/package.opf`, opf({ ncx: `Navigation/toc.ncx` })),
          textRecord(
            `EPUB/Navigation/toc.ncx`,
            `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>` +
              `<navPoint id="n1"><navLabel><text>Part 1</text></navLabel></navPoint>` +
              `</navMap></ncx>`,
          ),
        ],
        `book.epub`,
      ),
    )

    expect(resolved.toc).toEqual([
      { title: `Part 1`, path: ``, containerHref: ``, contents: [] },
    ])
  })
})

describe(`Given an EPUB with several renditions`, () => {
  const packageDocument = (title: string) =>
    `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">` +
    `<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title></metadata>` +
    `<manifest><item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/></manifest>` +
    `<spine><itemref idref="p1"/></spine></package>`

  it(`reads the default rendition, the first its container file lists`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`fixed/package.opf`, packageDocument(`Fixed layout`)),
          textRecord(`fixed/page1.xhtml`, xhtml(true)),
          textRecord(`reflowable/package.opf`, packageDocument(`Reflowable`)),
          textRecord(`reflowable/page1.xhtml`, xhtml(false)),
          textRecord(
            `META-INF/container.xml`,
            `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>` +
              `<rootfile full-path="reflowable/package.opf" media-type="application/oebps-package+xml"/>` +
              `<rootfile full-path="fixed/package.opf" media-type="application/oebps-package+xml"/>` +
              `</rootfiles></container>`,
          ),
        ],
        `book.epub`,
      ),
    )

    expect(resolved.metadata.titles?.[0]?.value).toBe(`Reflowable`)
    expect(resolved.readingOrder.map(({ uri }) => uri)).toEqual([
      `reflowable/page1.xhtml`,
    ])
  })
})

describe(`Given the file a book was opened from`, () => {
  const imageRecord = textRecord(`001.jpg`)
  const opfRecord = textRecord(`OEBPS/content.opf`)

  const resolveMediaType = async (
    archive: Parameters<typeof resolveArchive>[0],
  ) => (await resolveArchive(archive, { include: [] })).mediaType

  it(`the media type the archive declares wins, without its parameters`, async () => {
    const archive = createArchive({
      filename: `book.epub`,
      encodingFormat: `application/x-cbz; charset=binary`,
      records: [opfRecord],
      close: () => Promise.resolve(),
    })

    expect(await resolveMediaType(archive)).toBe(`application/x-cbz`)
  })

  it(`a declared type naming no book format gives way to the file name's extension`, async () => {
    // what a server declares for a file it knows no better, as GitHub serves
    // any binary file
    for (const encodingFormat of [
      `application/octet-stream`,
      `binary/octet-stream`,
      `application/zip`,
    ]) {
      const archive = createArchive({
        filename: `book.epub`,
        encodingFormat,
        records: [opfRecord],
        close: () => Promise.resolve(),
      })

      expect(await resolveMediaType(archive), encodingFormat).toBe(
        `application/epub+zip`,
      )
    }

    const comic = createArchive({
      filename: `comic.cbr`,
      encodingFormat: `application/vnd.rar`,
      records: [imageRecord],
      close: () => Promise.resolve(),
    })

    expect(await resolveMediaType(comic)).toBe(`application/vnd.comicbook-rar`)
  })

  it(`and to an EPUB container, a declared archive format standing when nothing else tells`, async () => {
    const declared = (
      encodingFormat: string,
      records: ReturnType<typeof textRecord>[],
    ) =>
      createArchive({
        encodingFormat,
        records,
        close: () => Promise.resolve(),
      })

    expect(
      await resolveMediaType(
        declared(`application/zip`, [
          textRecord(`META-INF/container.xml`),
          opfRecord,
        ]),
      ),
    ).toBe(`application/epub+zip`)
    expect(
      await resolveMediaType(declared(`application/zip`, [imageRecord])),
    ).toBe(`application/zip`)
    expect(
      await resolveMediaType(declared(`binary/octet-stream`, [imageRecord])),
    ).toBe(`application/octet-stream`)
  })

  it(`else the file name's extension tells it, in any case`, async () => {
    expect(await resolveMediaType(archiveWith([imageRecord], `Book.CBZ`))).toBe(
      `application/vnd.comicbook+zip`,
    )
    expect(await resolveMediaType(archiveWith([imageRecord], `a.pdf`))).toBe(
      `application/pdf`,
    )
    expect(await resolveMediaType(archiveWith([opfRecord], `comic.zip`))).toBe(
      `application/zip`,
    )
  })

  it(`else an OCF container file makes it an EPUB`, async () => {
    expect(
      await resolveMediaType(
        archiveWith([textRecord(`META-INF/container.xml`), opfRecord]),
      ),
    ).toBe(`application/epub+zip`)
  })

  it(`a list of URLs is the book the app declares it to be, and data of an unknown type otherwise`, async () => {
    const urls = [`https://cdn.example.com/page-1.jpg`]

    expect(
      await resolveMediaType(
        await createArchiveFromUrls(urls, {
          encodingFormat: `application/vnd.comicbook+zip`,
        }),
      ),
    ).toBe(`application/vnd.comicbook+zip`)
    // Its package document, which prose writes, makes it no EPUB.
    expect(await resolveMediaType(await createArchiveFromUrls(urls))).toBe(
      `application/octet-stream`,
    )
  })

  it(`else it is data of an unknown type, even with a package document`, async () => {
    expect(await resolveMediaType(archiveWith([opfRecord, imageRecord]))).toBe(
      `application/octet-stream`,
    )
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

    // nothing was read, so nothing can be reported broken; the media type
    // comes from the file name alone
    expect(resolved).toEqual({
      version: 5,
      mediaType: `application/epub+zip`,
      unreadableSources: [],
    })
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

  it(`should read a package document whose extension is in capitals`, async () => {
    const resolved = await resolveArchive(
      archiveWith(
        [
          textRecord(`OEBPS/CONTENT.OPF`, `<package/>`),
          textRecord(`OEBPS/page1.xhtml`, xhtml(false), { size: 100 }),
        ],
        `book.epub`,
      ),
      { include: [`sources`] },
    )

    expect(resolved.sources.opf?.basePath).toBe(`OEBPS`)
    expect(resolved.unreadableSources).toEqual([])
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
      comicInfo: { manga: true },
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
