import {
  blobFileAccessors,
  createArchive,
  createArchiveFromText,
} from "@prose-reader/archive-reader"
import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { generateManifestFromArchive } from "./index"

/**
 * Characterization tests for `generateManifestFromArchive`, one fixture per
 * supported container flavor, asserting complete manifests literally.
 *
 * Originally written against the format hook pipeline, they now lock the
 * `resolveArchive`-based implementation. Behaviors deliberately CHANGED by
 * that migration (each recorded on the assertion it affects):
 *
 * - A ComicInfo.xml no longer flattens an EPUB's size-proportional spine
 *   weights (the flattening was a side effect, not intent).
 * - Spine items are re-indexed after sidecar exclusion (a CBZ spine starts
 *   at index 0 again), and excluded files no longer inflate the progression
 *   weight denominator (weights sum to 1).
 * - ComicInfo `Title` now feeds the manifest title (filename stays the
 *   fallback).
 * - Kobo/Apple display-options sidecars are excluded from non-epub spines.
 * - Spine `mediaType` falls back to filename detection when the record
 *   carries no encodingFormat.
 *
 * Behaviors deliberately KEPT:
 *
 * - ComicInfo `Manga` beats OPF `page-progression-direction` for
 *   `readingDirection` (also recorded in archive-reader's resolveMetadata
 *   tests).
 * - Kobo/Apple display options set the manifest-level `renditionLayout` only;
 *   epub spine items keep `renditionLayout: undefined`.
 * - A plain comic archive gets per-item `pre-paginated` but keeps the
 *   manifest-level `renditionLayout` undefined.
 * - Sidecar files stay listed in `items` (they remain addressable resources).
 * - With no baseUrl, spine hrefs get a `file://` prefix but `items` hrefs stay
 *   bare container paths (non-epub), and guide hrefs are never rebased at all.
 *
 * If a change makes one of these assertions fail, that change must be a
 * deliberate decision recorded by updating the expectation — not an accident.
 */

const file = (
  uri: string,
  content: string,
  { size, encodingFormat }: { size?: number; encodingFormat?: string } = {},
) => ({
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  dir: false as const,
  size: size ?? new Blob([content]).size,
  ...(encodingFormat !== undefined ? { encodingFormat } : {}),
})

const folder = (uri: string) => ({
  ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
  basename: `${uri.replace(/\/$/, ``).split(`/`).pop() ?? uri}/`,
  uri,
  dir: true as const,
})

const xhtml = ({ title, viewport }: { title: string; viewport?: boolean }) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${title}</title>
    ${viewport ? `<meta name="viewport" content="width=1200, height=600" />` : ``}
  </head>
  <body><p>${title}</p></body>
</html>`

const KOBO_FIXED_LAYOUT_XML = `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`
const APPLE_FIXED_LAYOUT_XML = `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`

describe(`Given a reflowable EPUB with OPF in a subfolder, NCX toc, guide and a baseUrl`, () => {
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Characterization Book</dc:title>
    <dc:identifier id="uid">urn:uuid:characterization-book</dc:identifier>
    <dc:creator>Jane Author</dc:creator>
    <dc:language>en</dc:language>
    <meta property="rendition:layout">reflowable</meta>
    <meta property="rendition:flow">scrolled-doc</meta>
    <meta property="rendition:spread">both</meta>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx" page-progression-direction="rtl">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
  <guide>
    <reference type="cover" title="Cover" href="chapter1.xhtml"/>
    <reference type="acknowledgements" title="Thanks" href="chapter2.xhtml"/>
  </guide>
</package>`

  const ncx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="np-1">
      <navLabel><text>Chapter 1</text></navLabel>
      <content src="chapter1.xhtml"/>
      <navPoint id="np-1-1">
        <navLabel><text>Section 1.1</text></navLabel>
        <content src="chapter1.xhtml"/>
      </navPoint>
    </navPoint>
    <navPoint id="np-2">
      <navLabel><text>Chapter 2</text></navLabel>
      <content src="chapter2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`

  it(`should generate the full manifest, size-proportional weights, rebased hrefs and non-rebased guide`, async () => {
    const archive = createArchive({
      filename: `characterization.epub`,
      records: [
        file(`OEBPS/content.opf`, opf),
        file(`OEBPS/chapter1.xhtml`, xhtml({ title: `Chapter 1` }), {
          size: 100,
        }),
        file(`OEBPS/chapter2.xhtml`, xhtml({ title: `Chapter 2` }), {
          size: 300,
        }),
        file(`OEBPS/style.css`, `body { margin: 0 }`, { size: 50 }),
        file(`OEBPS/toc.ncx`, ncx),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive, {
      baseUrl: `http://localhost:9000/book`,
    })

    expect(manifest).toEqual({
      filename: `characterization.epub`,
      title: `Characterization Book`,
      renditionLayout: `reflowable`,
      renditionFlow: `scrolled-doc`,
      renditionSpread: `both`,
      readingDirection: `rtl`,
      spineItems: [
        {
          id: `ch1`,
          index: 0,
          href: `http://localhost:9000/book/OEBPS/chapter1.xhtml`,
          renditionLayout: `reflowable`,
          progressionWeight: 0.25,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `ch2`,
          index: 1,
          href: `http://localhost:9000/book/OEBPS/chapter2.xhtml`,
          renditionLayout: `reflowable`,
          progressionWeight: 0.75,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `ch1`,
          href: `http://localhost:9000/book/OEBPS/chapter1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `ch2`,
          href: `http://localhost:9000/book/OEBPS/chapter2.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `css`,
          href: `http://localhost:9000/book/OEBPS/style.css`,
          mediaType: `text/css`,
        },
        {
          id: `ncx`,
          href: `http://localhost:9000/book/OEBPS/toc.ncx`,
          mediaType: `application/x-dtbncx+xml`,
        },
      ],
      // guide hrefs stay opf-relative (never rebased); unknown types dropped
      guide: [{ href: `chapter1.xhtml`, title: `Cover`, type: `cover` }],
      nav: {
        toc: [
          {
            title: `Chapter 1`,
            path: `OEBPS/chapter1.xhtml`,
            href: `http://localhost:9000/book/OEBPS/chapter1.xhtml`,
            contents: [
              {
                title: `Section 1.1`,
                path: `OEBPS/chapter1.xhtml`,
                href: `http://localhost:9000/book/OEBPS/chapter1.xhtml`,
                contents: [],
              },
            ],
          },
          {
            title: `Chapter 2`,
            path: `OEBPS/chapter2.xhtml`,
            href: `http://localhost:9000/book/OEBPS/chapter2.xhtml`,
            contents: [],
          },
        ],
      },
    } satisfies Manifest)
  })
})

describe(`Given an explicitly pre-paginated (FXL) EPUB with page spreads and a per-item layout override`, () => {
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>FXL Book</dc:title>
    <meta property="rendition:layout">pre-paginated</meta>
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="page2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="p1" properties="page-spread-left"/>
    <itemref idref="p2" properties="page-spread-right rendition:layout-reflowable"/>
  </spine>
</package>`

  it(`should generate the full manifest with file:// hrefs and itemref layout hints`, async () => {
    const archive = createArchive({
      filename: `fxl.epub`,
      records: [
        file(`content.opf`, opf),
        file(`page1.xhtml`, xhtml({ title: `Page 1` }), { size: 100 }),
        file(`page2.xhtml`, xhtml({ title: `Page 2` }), { size: 100 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `fxl.epub`,
      title: `FXL Book`,
      renditionLayout: `pre-paginated`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `p1`,
          index: 0,
          href: `file://page1.xhtml`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: true,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          index: 1,
          href: `file://page2.xhtml`,
          // itemref `rendition:layout-reflowable` overrides the package layout
          renditionLayout: `reflowable`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: true,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `p1`,
          href: `file://page1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          href: `file://page2.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
      ],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })
})

describe(`Given a reflowable EPUB whose spine documents all declare a viewport`, () => {
  const opfWithSpine = (
    spineItems: string,
  ) => `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Viewport Book</dc:title>
    <meta property="rendition:layout">reflowable</meta>
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    ${spineItems}
  </manifest>
  <spine>
    <itemref idref="p1"/>
    <itemref idref="p2"/>
  </spine>
</package>`

  it(`should promote the whole book to pre-paginated`, async () => {
    const opf = opfWithSpine(
      `<item id="p2" href="page2.xhtml" media-type="application/xhtml+xml"/>`,
    )
    const archive = createArchive({
      filename: `viewport.epub`,
      records: [
        file(`content.opf`, opf),
        file(`page1.xhtml`, xhtml({ title: `Page 1`, viewport: true }), {
          size: 100,
        }),
        file(`page2.xhtml`, xhtml({ title: `Page 2`, viewport: true }), {
          size: 100,
        }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `viewport.epub`,
      title: `Viewport Book`,
      renditionLayout: `pre-paginated`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `p1`,
          index: 0,
          href: `file://page1.xhtml`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          index: 1,
          href: `file://page2.xhtml`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `p1`,
          href: `file://page1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          href: `file://page2.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
      ],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })

  it(`should not promote when one spine item is not XML-based`, async () => {
    const opf = opfWithSpine(
      `<item id="p2" href="page2.jpg" media-type="image/jpeg"/>`,
    )
    const archive = createArchive({
      filename: `viewport.epub`,
      records: [
        file(`content.opf`, opf),
        file(`page1.xhtml`, xhtml({ title: `Page 1`, viewport: true }), {
          size: 100,
        }),
        file(`page2.jpg`, ``, { size: 100, encodingFormat: `image/jpeg` }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.renditionLayout).toBe(`reflowable`)
    // in an epub even an image spine item inherits the package layout, and
    // nonEpub normalization does not apply
    expect(manifest.spineItems.map((item) => item.renditionLayout)).toEqual([
      `reflowable`,
      `reflowable`,
    ])
  })
})

describe(`Given an EPUB that also contains a ComicInfo.xml`, () => {
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Epub With ComicInfo</dc:title>
    <meta property="rendition:layout">pre-paginated</meta>
  </metadata>
  <manifest>
    <item id="p1" href="page1.xhtml" media-type="application/xhtml+xml"/>
    <item id="p2" href="page2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine page-progression-direction="ltr">
    <itemref idref="p1"/>
    <itemref idref="p2"/>
  </spine>
</package>`

  const comicInfo = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Manga>YesAndRightToLeft</Manga>
</ComicInfo>`

  it(`should let ComicInfo beat the OPF reading direction and keep size weights`, async () => {
    const archive = createArchive({
      filename: `epub-with-comicinfo.epub`,
      records: [
        file(`ComicInfo.xml`, comicInfo),
        file(`content.opf`, opf),
        file(`page1.xhtml`, xhtml({ title: `Page 1` }), { size: 100 }),
        file(`page2.xhtml`, xhtml({ title: `Page 2` }), { size: 300 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `epub-with-comicinfo.epub`,
      title: `Epub With ComicInfo`,
      renditionLayout: `pre-paginated`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      // ComicInfo `Manga` wins over the explicit OPF page-progression-direction
      readingDirection: `rtl`,
      spineItems: [
        {
          id: `p1`,
          index: 0,
          href: `file://page1.xhtml`,
          renditionLayout: `pre-paginated`,
          // deliberate change with the resolveArchive migration: the sidecar
          // no longer flattens the size-proportional epub weights
          progressionWeight: 0.25,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          index: 1,
          href: `file://page2.xhtml`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.75,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `p1`,
          href: `file://page1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
        {
          id: `p2`,
          href: `file://page2.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
      ],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })
})

describe(`Given a flat CBZ with a ComicInfo.xml`, () => {
  const comicInfo = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Title>Vol 1</Title>
  <Series>Characterization Comics</Series>
  <Writer>Jane Author</Writer>
  <Manga>YesAndRightToLeft</Manga>
</ComicInfo>`

  it(`should strip ComicInfo from the spine but not from items`, async () => {
    const archive = createArchive({
      filename: `my comic.cbz`,
      records: [
        file(`ComicInfo.xml`, comicInfo),
        file(`page_001.jpg`, ``, { size: 100, encodingFormat: `image/jpeg` }),
        file(`page_002.jpg`, ``, { size: 100, encodingFormat: `image/jpeg` }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `my comic.cbz`,
      // deliberate change with the resolveArchive migration: the ComicInfo
      // Title now feeds the manifest title instead of the filename
      title: `Vol 1`,
      // no manifest-level layout for a plain comic; only items are marked
      renditionLayout: undefined,
      renditionSpread: `auto`,
      readingDirection: `rtl`,
      spineItems: [
        {
          id: `page_001.jpg`,
          // deliberate change: the spine is re-indexed after the sidecar
          // exclusion, no more index gap
          index: 0,
          href: `file://page_001.jpg`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `image/jpeg`,
        },
        {
          id: `page_002.jpg`,
          index: 1,
          href: `file://page_002.jpg`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `image/jpeg`,
        },
      ],
      // ComicInfo.xml is stripped from the spine but stays in items, and
      // items hrefs are bare container paths (no file:// prefix)
      items: [
        { id: `ComicInfo.xml`, href: `ComicInfo.xml` },
        { id: `page_001.jpg`, href: `page_001.jpg` },
        { id: `page_002.jpg`, href: `page_002.jpg` },
      ],
    } satisfies Manifest)
  })
})

describe(`Given an EPUB with a Kobo display-options sidecar`, () => {
  const opfWithLayout = (
    layoutMeta: string,
  ) => `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Kobo Flagged Book</dc:title>
    ${layoutMeta}
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`

  it(`should fill the manifest renditionLayout when the OPF does not declare one`, async () => {
    const archive = createArchive({
      filename: `kobo.epub`,
      records: [
        file(`content.opf`, opfWithLayout(``)),
        file(
          `META-INF/com.kobobooks.display-options.xml`,
          KOBO_FIXED_LAYOUT_XML,
        ),
        file(`ch1.xhtml`, xhtml({ title: `Chapter 1` }), { size: 10 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `kobo.epub`,
      title: `Kobo Flagged Book`,
      renditionLayout: `pre-paginated`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `ch1`,
          index: 0,
          href: `file://ch1.xhtml`,
          // kobo only fills the manifest-level layout, items stay undefined
          renditionLayout: undefined,
          progressionWeight: 1,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `ch1`,
          href: `file://ch1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
      ],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })

  it(`should not override an explicit OPF reflowable layout`, async () => {
    const archive = createArchive({
      filename: `kobo.epub`,
      records: [
        file(
          `content.opf`,
          opfWithLayout(`<meta property="rendition:layout">reflowable</meta>`),
        ),
        file(
          `META-INF/com.kobobooks.display-options.xml`,
          KOBO_FIXED_LAYOUT_XML,
        ),
        file(`ch1.xhtml`, xhtml({ title: `Chapter 1` }), { size: 10 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.renditionLayout).toBe(`reflowable`)
    expect(manifest.spineItems[0]?.renditionLayout).toBe(`reflowable`)
  })
})

describe(`Given an EPUB with an Apple display-options sidecar`, () => {
  const opfWithLayout = (
    layoutMeta: string,
  ) => `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Apple Flagged Book</dc:title>
    ${layoutMeta}
  </metadata>
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`

  it(`should fill the manifest renditionLayout when the OPF does not declare one`, async () => {
    const archive = createArchive({
      filename: `apple.epub`,
      records: [
        file(`content.opf`, opfWithLayout(``)),
        file(
          `META-INF/com.apple.ibooks.display-options.xml`,
          APPLE_FIXED_LAYOUT_XML,
        ),
        file(`ch1.xhtml`, xhtml({ title: `Chapter 1` }), { size: 10 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `apple.epub`,
      title: `Apple Flagged Book`,
      renditionLayout: `pre-paginated`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `ch1`,
          index: 0,
          href: `file://ch1.xhtml`,
          // apple only fills the manifest-level layout, items stay undefined
          renditionLayout: undefined,
          progressionWeight: 1,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `application/xhtml+xml`,
        },
      ],
      items: [
        {
          id: `ch1`,
          href: `file://ch1.xhtml`,
          mediaType: `application/xhtml+xml`,
        },
      ],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })

  it(`should not override an explicit OPF reflowable layout`, async () => {
    const archive = createArchive({
      filename: `apple.epub`,
      records: [
        file(
          `content.opf`,
          opfWithLayout(`<meta property="rendition:layout">reflowable</meta>`),
        ),
        file(
          `META-INF/com.apple.ibooks.display-options.xml`,
          APPLE_FIXED_LAYOUT_XML,
        ),
        file(`ch1.xhtml`, xhtml({ title: `Chapter 1` }), { size: 10 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.renditionLayout).toBe(`reflowable`)
    expect(manifest.spineItems[0]?.renditionLayout).toBe(`reflowable`)
  })
})

describe(`Given a flat audiobook archive`, () => {
  it(`should build the audiobook toc and equal progression weights`, async () => {
    const archive = createArchive({
      filename: `audiobook.zip`,
      records: [
        file(`chapter-01.mp3`, ``, { size: 100, encodingFormat: `audio/mpeg` }),
        file(`chapter-02-final.mp3`, ``, {
          size: 300,
          encodingFormat: `audio/mpeg`,
        }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `audiobook.zip`,
      title: `audiobook.zip`,
      renditionLayout: undefined,
      renditionSpread: `auto`,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `chapter-01.mp3`,
          index: 0,
          href: `file://chapter-01.mp3`,
          renditionLayout: `pre-paginated`,
          // weights are an equal split for non-epub, regardless of sizes
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `audio/mpeg`,
        },
        {
          id: `chapter-02-final.mp3`,
          index: 1,
          href: `file://chapter-02-final.mp3`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `audio/mpeg`,
        },
      ],
      items: [
        { id: `chapter-01.mp3`, href: `chapter-01.mp3` },
        { id: `chapter-02-final.mp3`, href: `chapter-02-final.mp3` },
      ],
      nav: {
        toc: [
          {
            title: `chapter 01`,
            path: `chapter-01.mp3`,
            href: `file://chapter-01.mp3`,
            contents: [],
          },
          {
            title: `chapter 02 final`,
            path: `chapter-02-final.mp3`,
            href: `file://chapter-02-final.mp3`,
            contents: [],
          },
        ],
      },
    } satisfies Manifest)
  })
})

describe(`Given text content`, () => {
  it(`should generate a reflowable single-item manifest through the generated OPF`, async () => {
    const archive = await createArchiveFromText(`Hello world`)

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: `content.txt`,
      title: ``,
      renditionLayout: `reflowable`,
      renditionFlow: `auto`,
      renditionSpread: undefined,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `p01`,
          index: 0,
          href: `file://p01.txt`,
          renditionLayout: `reflowable`,
          progressionWeight: 1,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `text/plain`,
        },
      ],
      items: [{ id: `p01`, href: `file://p01.txt`, mediaType: `text/plain` }],
      guide: undefined,
      nav: { toc: [] },
    } satisfies Manifest)
  })
})

describe(`Given a folder comic with a .db file`, () => {
  it(`should exclude .db from the spine and the weight denominator but keep it in items`, async () => {
    const archive = createArchive({
      filename: `comic.cbz`,
      records: [
        folder(`Album/`),
        file(`Album/page1.jpg`, ``, { size: 1, encodingFormat: `image/jpeg` }),
        file(`Album/page2.jpg`, ``, { size: 1, encodingFormat: `image/jpeg` }),
        file(`Album/Thumbs.db`, ``, { size: 1 }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive, {
      baseUrl: `http://localhost:9000`,
    })

    expect(manifest).toEqual({
      filename: `comic.cbz`,
      // title comes from the first directory record
      title: `Album`,
      renditionLayout: undefined,
      renditionSpread: `auto`,
      readingDirection: `ltr`,
      spineItems: [
        {
          id: `Album_page1.jpg`,
          index: 0,
          href: `http://localhost:9000/Album/page1.jpg`,
          renditionLayout: `pre-paginated`,
          // deliberate change with the resolveArchive migration: the excluded
          // .db file no longer inflates the denominator, weights sum to 1
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `image/jpeg`,
        },
        {
          id: `Album_page2.jpg`,
          index: 1,
          href: `http://localhost:9000/Album/page2.jpg`,
          renditionLayout: `pre-paginated`,
          progressionWeight: 0.5,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          mediaType: `image/jpeg`,
        },
      ],
      items: [
        {
          id: `Album_page1.jpg`,
          href: `http://localhost:9000/Album/page1.jpg`,
        },
        {
          id: `Album_page2.jpg`,
          href: `http://localhost:9000/Album/page2.jpg`,
        },
        {
          id: `Album_Thumbs.db`,
          href: `http://localhost:9000/Album/Thumbs.db`,
        },
      ],
      nav: {
        toc: [
          {
            title: `Album`,
            path: `Album/page1.jpg`,
            href: `http://localhost:9000/Album/page1.jpg`,
            contents: [],
          },
        ],
      },
    } satisfies Manifest)
  })
})

describe(`Given a comic with a Kobo display-options sidecar`, () => {
  it(`should use the sidecar for the layout and keep it out of the spine`, async () => {
    const archive = createArchive({
      filename: `comic.cbz`,
      records: [
        file(
          `com.kobobooks.display-options.xml`,
          KOBO_FIXED_LAYOUT_XML,
          // realistic zips carry a size for every record
          { size: KOBO_FIXED_LAYOUT_XML.length },
        ),
        file(`page1.jpg`, ``, { size: 1, encodingFormat: `image/jpeg` }),
      ],
      close: () => Promise.resolve(),
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.renditionLayout).toBe(`pre-paginated`)
    // deliberate change with the resolveArchive migration: display-options
    // sidecars are no longer part of a non-epub spine (they stay in items)
    expect(manifest.spineItems.map((item) => item.id)).toEqual([`page1.jpg`])
    expect(manifest.items.map((item) => item.id)).toEqual([
      `com.kobobooks.display-options.xml`,
      `page1.jpg`,
    ])
  })
})
