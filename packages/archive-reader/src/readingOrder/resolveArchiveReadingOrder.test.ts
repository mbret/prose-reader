import { describe, expect, it } from "vitest"
import { createArchive } from "../archives/createArchive"
import { blobFileAccessors } from "../archives/fileAccessors"
import { resolveArchiveReadingOrder } from "./resolveArchiveReadingOrder"

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

const archiveWith = (records: ReturnType<typeof textRecord>[]) =>
  createArchive({
    filename: `archive`,
    records,
    close: () => Promise.resolve(),
  })

describe(`Given an EPUB with the OPF in a subfolder`, () => {
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <meta property="rendition:layout">pre-paginated</meta>
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="page2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
  </manifest>
  <spine>
    <itemref idref="p1" properties="page-spread-left"/>
    <itemref idref="p2" properties="page-spread-right rendition:layout-reflowable"/>
  </spine>
</package>`

  it(`should resolve container-relative uris, spine hints and size weights`, async () => {
    const archive = archiveWith([
      textRecord(`OEBPS/content.opf`, opf),
      textRecord(`OEBPS/page1.xhtml`, ``, { size: 100 }),
      textRecord(`OEBPS/page2.xhtml`, ``, { size: 300 }),
      textRecord(`OEBPS/style.css`, ``, { size: 50 }),
    ])

    expect(await resolveArchiveReadingOrder(archive)).toEqual([
      {
        uri: `OEBPS/page1.xhtml`,
        id: `p1`,
        mediaType: `application/xhtml+xml`,
        size: 100,
        renditionLayout: `pre-paginated`,
        pageSpreadLeft: true,
        progressionWeight: 0.25,
      },
      {
        uri: `OEBPS/page2.xhtml`,
        id: `p2`,
        mediaType: `application/xhtml+xml`,
        size: 300,
        // itemref override beats the package layout
        renditionLayout: `reflowable`,
        pageSpreadRight: true,
        progressionWeight: 0.75,
      },
    ])
  })

  it(`should resolve the same with an already parsed opf`, async () => {
    const archive = archiveWith([
      textRecord(`OEBPS/content.opf`, opf),
      textRecord(`OEBPS/page1.xhtml`, ``, { size: 100 }),
      textRecord(`OEBPS/page2.xhtml`, ``, { size: 300 }),
    ])

    const { readArchiveOpf } = await import(`../metadata/opf/readArchiveOpf`)
    const parsed = await readArchiveOpf(archive)

    expect(await resolveArchiveReadingOrder(archive, { opf: parsed })).toEqual(
      await resolveArchiveReadingOrder(archive),
    )
  })

  it(`should resolve dot segments in spine hrefs against the OPF directory`, async () => {
    const nestedOpf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="p1" href="../Text/page1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="p1"/></spine>
</package>`

    const archive = archiveWith([
      textRecord(`OEBPS/OPF/content.opf`, nestedOpf),
      textRecord(`OEBPS/Text/page1.xhtml`, ``, { size: 100 }),
    ])

    expect(
      (await resolveArchiveReadingOrder(archive)).map((item) => item.uri),
    ).toEqual([`OEBPS/Text/page1.xhtml`])
  })
})

describe(`Given an EPUB whose spine records are missing sizes`, () => {
  it(`should fall back to an equal split`, async () => {
    const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="missing.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="p1"/><itemref idref="p2"/></spine>
</package>`

    const archive = archiveWith([
      textRecord(`content.opf`, opf),
      textRecord(`page1.xhtml`, ``, { size: 0 }),
    ])

    const readingOrder = await resolveArchiveReadingOrder(archive)

    expect(readingOrder.map((item) => item.progressionWeight)).toEqual([
      0.5, 0.5,
    ])
    // a dangling spine href still yields an entry, without record knowledge
    expect(readingOrder[1]).toEqual({
      uri: `missing.xhtml`,
      id: `p2`,
      mediaType: `application/xhtml+xml`,
      progressionWeight: 0.5,
    })
  })
})

describe(`Given an EPUB authored over absolute urls`, () => {
  it(`should pass the urls through as record uris`, async () => {
    const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="p1" href="https://cdn.example.com/page-1.jpg" media-type="image/jpg"/>
  </manifest>
  <spine><itemref idref="p1"/></spine>
</package>`

    const archive = archiveWith([
      textRecord(`content.opf`, opf),
      textRecord(`https://cdn.example.com/page-1.jpg`, ``, { size: 1 }),
    ])

    expect(await resolveArchiveReadingOrder(archive)).toEqual([
      {
        uri: `https://cdn.example.com/page-1.jpg`,
        id: `p1`,
        mediaType: `image/jpg`,
        size: 1,
        progressionWeight: 1,
      },
    ])
  })
})

describe(`Given an archive whose package document is malformed`, () => {
  it(`should degrade to the file listing instead of throwing`, async () => {
    const archive = archiveWith([
      // mismatched close tag: parseOpf's XmlDocument rejects it
      textRecord(
        `OEBPS/content.opf`,
        `<?xml version="1.0"?><package><spine></package>`,
      ),
      textRecord(`OEBPS/page1.xhtml`, ``, { size: 100 }),
      textRecord(`OEBPS/page2.xhtml`, ``, { size: 300 }),
    ])

    const readingOrder = await resolveArchiveReadingOrder(archive)

    // the unparseable OPF is treated as no OPF: fall back to the file listing
    expect(readingOrder.map((item) => item.uri)).toEqual([
      `OEBPS/content.opf`,
      `OEBPS/page1.xhtml`,
      `OEBPS/page2.xhtml`,
    ])
    // records fallback splits progression equally
    expect(readingOrder.map((item) => item.progressionWeight)).toEqual([
      1 / 3,
      1 / 3,
      1 / 3,
    ])
  })
})

describe(`Given a comic archive with sidecars and OS litter`, () => {
  it(`should exclude them from the reading order and the weight denominator`, async () => {
    const archive = archiveWith([
      textRecord(`ComicInfo.xml`, `<ComicInfo/>`),
      textRecord(`com.kobobooks.display-options.xml`, `<display_options/>`),
      textRecord(`META-INF/com.apple.ibooks.display-options.xml`, ``),
      textRecord(`Thumbs.db`, ``, { size: 10 }),
      textRecord(`page_001.jpg`, ``, {
        size: 100,
        encodingFormat: `image/jpeg`,
      }),
      textRecord(`page_002.jpg`, ``, {
        size: 200,
        encodingFormat: `image/jpeg`,
      }),
    ])

    expect(await resolveArchiveReadingOrder(archive)).toEqual([
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
        size: 200,
        renditionLayout: `pre-paginated`,
        progressionWeight: 0.5,
      },
    ])
  })
})

describe(`Given a non-epub archive without encoding formats`, () => {
  it(`should detect media types from filenames and mark discrete media pre-paginated`, async () => {
    const archive = archiveWith([
      textRecord(`track-01.mp3`, ``, { size: 1 }),
      textRecord(`notes.txt`, ``, { size: 1 }),
    ])

    expect(await resolveArchiveReadingOrder(archive)).toEqual([
      {
        uri: `track-01.mp3`,
        mediaType: `audio/mpeg`,
        size: 1,
        renditionLayout: `pre-paginated`,
        progressionWeight: 0.5,
      },
      {
        uri: `notes.txt`,
        mediaType: `text/plain`,
        size: 1,
        progressionWeight: 0.5,
      },
    ])
  })
})
