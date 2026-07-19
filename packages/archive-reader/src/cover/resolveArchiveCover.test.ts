import { describe, expect, it } from "vitest"
import { createArchive } from "../archives/createArchive"
import { blobFileAccessors } from "../archives/fileAccessors"
import { readArchiveOpf } from "../opf/readArchiveOpf"
import { resolveArchiveCover } from "./resolveArchiveCover"

const textRecord = (
  uri: string,
  content = ``,
  { encodingFormat }: { encodingFormat?: string } = {},
) => ({
  dir: false as const,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: content.length,
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

const epubWith = (manifest: string, metadata = ``, basePath = `OEBPS`) => {
  const prefix = basePath === `` ? `` : `${basePath}/`
  const opf = `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>My Book</dc:title>
    ${metadata}
  </metadata>
  <manifest>${manifest}</manifest>
  <spine><itemref idref="p1"/></spine>
</package>`

  return archiveWith(
    [
      textRecord(`${prefix}content.opf`, opf),
      textRecord(`${prefix}page1.xhtml`, `<html/>`),
      textRecord(`${prefix}cover.jpg`, ``, { encodingFormat: `image/jpeg` }),
    ],
    `book.epub`,
  )
}

describe(`Given an EPUB with an OPF cover`, () => {
  it(`resolves the EPUB 3 cover-image item, rebased onto the base path`, async () => {
    const archive = epubWith(
      `<item id="c" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>` +
        `<item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `OEBPS/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`resolves the EPUB 2 <meta name="cover"> convention`, async () => {
    const archive = epubWith(
      `<item id="cover-img" href="cover.jpg" media-type="image/jpeg"/>` +
        `<item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>`,
      `<meta name="cover" content="cover-img"/>`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `OEBPS/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`does not prefix a base path when the OPF sits at the root`, async () => {
    const archive = epubWith(
      `<item id="c" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>` +
        `<item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>`,
      ``,
      ``,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })

  it(`resolves dot segments in the cover href against the OPF directory`, async () => {
    // OPF nested under OEBPS/Text, cover a sibling folder up via `../Images`.
    // EPUB resolves this to OEBPS/Images/cover.jpg — the real record uri —
    // not the verbatim OEBPS/Text/../Images/cover.jpg concatenation.
    const archive = archiveWith(
      [
        textRecord(
          `OEBPS/Text/content.opf`,
          `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>x</dc:title></metadata>
  <manifest>
    <item id="c" href="../Images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="p1"/></spine>
</package>`,
        ),
        textRecord(`OEBPS/Text/page1.xhtml`, `<html/>`),
        textRecord(`OEBPS/Images/cover.jpg`, ``, {
          encodingFormat: `image/jpeg`,
        }),
      ],
      `book.epub`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `OEBPS/Images/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })
})

describe(`Given an EPUB whose OPF declares no cover`, () => {
  it(`returns undefined rather than promoting an interior image`, async () => {
    const archive = epubWith(
      `<item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>` +
        `<item id="i" href="cover.jpg" media-type="image/jpeg"/>`,
    )

    expect(await resolveArchiveCover(archive)).toBeUndefined()
  })
})

describe(`Given a package-less container`, () => {
  it(`falls back to the first reading-order resource, sidecars excluded`, async () => {
    const archive = archiveWith(
      [
        textRecord(`ComicInfo.xml`, `<?xml version="1.0"?><ComicInfo/>`),
        textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
        textRecord(`page_002.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ],
      `comic.cbz`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `page_001.jpg`,
      mediaType: `image/jpeg`,
      confidence: `assumed`,
    })
  })

  it(`skips non-image reading-order items to reach the cover image`, async () => {
    const archive = archiveWith(
      [
        textRecord(`intro.mp3`, ``, { encodingFormat: `audio/mpeg` }),
        textRecord(`cover.png`, ``, { encodingFormat: `image/png` }),
      ],
      `mixed.zip`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `cover.png`,
      mediaType: `image/png`,
      confidence: `assumed`,
    })
  })

  it(`returns undefined when no reading-order item is an image`, async () => {
    const archive = archiveWith(
      [
        textRecord(`track01.mp3`, ``, { encodingFormat: `audio/mpeg` }),
        textRecord(`track02.mp3`, ``, { encodingFormat: `audio/mpeg` }),
      ],
      `audiobook.zip`,
    )

    expect(await resolveArchiveCover(archive)).toBeUndefined()
  })

  it(`returns undefined for an empty container`, async () => {
    expect(await resolveArchiveCover(archiveWith([]))).toBeUndefined()
  })
})

describe(`Given a malformed OPF`, () => {
  it(`degrades to the first image of the file listing rather than throwing`, async () => {
    const archive = archiveWith(
      [
        // mismatched close tag: parseOpf's XmlDocument rejects it, so the opf
        // read throws and the cover degrades to the file-listing fallback —
        // which skips the .opf (not an image) and lands on the first image
        textRecord(
          `content.opf`,
          `<?xml version="1.0"?><package><spine></package>`,
        ),
        textRecord(`page_001.jpg`, ``, { encodingFormat: `image/jpeg` }),
      ],
      `book.epub`,
    )

    expect(await resolveArchiveCover(archive)).toEqual({
      uri: `page_001.jpg`,
      mediaType: `image/jpeg`,
      confidence: `assumed`,
    })
  })
})

describe(`Given an already parsed opf`, () => {
  it(`uses it without re-reading the archive`, async () => {
    const archive = epubWith(
      `<item id="c" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>` +
        `<item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>`,
    )
    const opf = await readArchiveOpf(archive)

    expect(await resolveArchiveCover(archive, { opf })).toEqual({
      uri: `OEBPS/cover.jpg`,
      mediaType: `image/jpeg`,
      confidence: `derived`,
    })
  })
})
