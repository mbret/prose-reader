import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createArchive } from "../archives/createArchive"
import { blobFileAccessors } from "../archives/fileAccessors"
import { readArchiveOpf } from "../metadata/opf/readArchiveOpf"
import { resolveArchiveToc } from "./resolveArchiveToc"

const textRecord = (uri: string, content = ``) => ({
  dir: false,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: content.length,
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
})

const readFixture = (file: string) =>
  fs.promises.readFile(
    path.resolve(__dirname, `fixtures/tocWithPrefix/${file}`),
    `utf8`,
  )

describe(`Given ncx toc with prefix`, () => {
  it(`should resolve the container relative toc correctly`, async () => {
    const ncx = await readFixture(`toc.ncx`)
    const opfRaw = await readFixture(`content.opf`)
    const expected = JSON.parse(await readFixture(`toc.json`))

    const archive = createArchive({
      filename: `archive`,
      records: [
        textRecord(`OEBPS/content.opf`, opfRaw),
        textRecord(`OEBPS/toc.ncx`, ncx),
      ],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual(expected)

    // providing an already parsed opf skips the lookup but resolves the same
    const opf = await readArchiveOpf(archive)
    expect(await resolveArchiveToc(archive, { opf })).toEqual(expected)
  })
})

describe(`Given an ncx located in a different directory than the opf`, () => {
  it(`should resolve content src relative to the ncx file, not the opf`, async () => {
    const opf = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><manifest><item id="ncx" href="OEBPS/toc.ncx" media-type="application/x-dtbncx+xml"/><item id="ch1" href="OEBPS/chapter1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="ch1"/></spine></package>`
    const ncx = `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="np1" playOrder="1"><navLabel><text>Chapter 1</text></navLabel><content src="chapter1.xhtml"/><navPoint id="np2" playOrder="2"><navLabel><text>Section 1.1</text></navLabel><content src="chapter1.xhtml#s1"/></navPoint></navPoint></navMap></ncx>`

    const archive = createArchive({
      filename: `archive`,
      records: [
        textRecord(`content.opf`, opf),
        textRecord(`OEBPS/toc.ncx`, ncx),
        textRecord(`OEBPS/chapter1.xhtml`),
      ],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual([
      {
        title: `Chapter 1`,
        path: `OEBPS/chapter1.xhtml`,
        containerHref: `OEBPS/chapter1.xhtml`,
        contents: [
          {
            title: `Section 1.1`,
            path: `OEBPS/chapter1.xhtml#s1`,
            containerHref: `OEBPS/chapter1.xhtml#s1`,
            contents: [],
          },
        ],
      },
    ])
  })
})

describe(`Given an epub without nav document nor ncx`, () => {
  it(`should resolve an explicit empty toc instead of guessing from folders`, async () => {
    const archive = createArchive({
      filename: `archive`,
      records: [
        textRecord(
          `OEBPS/content.opf`,
          `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest></manifest><spine></spine></package>`,
        ),
        textRecord(`OEBPS/chapter one/index.html`),
      ],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual([])
  })
})

describe(`Given a non epub archive with folders`, () => {
  it(`should resolve a toc from the folder hierarchy with raw path and encoded containerHref`, async () => {
    const archive = createArchive({
      filename: `archive`,
      records: [
        textRecord(`folder c/2.jpg`),
        textRecord(`folder c/1.jpg`),
        textRecord(`folder a/folder b/1.jpg`),
        textRecord(`folder a/Screenshot from 2024-08-28 13-21-11.png`),
        textRecord(`folder d/folder e/4.jpg`),
      ],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual([
      {
        contents: [
          {
            contents: [],
            containerHref: `folder%20a/folder%20b/1.jpg`,
            path: `folder a/folder b/1.jpg`,
            title: `folder b`,
          },
        ],
        containerHref: `folder%20a/Screenshot%20from%202024-08-28%2013-21-11.png`,
        path: `folder a/Screenshot from 2024-08-28 13-21-11.png`,
        title: `folder a`,
      },
      {
        contents: [],
        containerHref: `folder%20c/1.jpg`,
        path: `folder c/1.jpg`,
        title: `folder c`,
      },
      {
        contents: [
          {
            contents: [],
            containerHref: `folder%20d/folder%20e/4.jpg`,
            path: `folder d/folder e/4.jpg`,
            title: `folder e`,
          },
        ],
        containerHref: `folder%20d/folder%20e/4.jpg`,
        path: `folder d/folder e/4.jpg`,
        title: `folder d`,
      },
    ])
  })
})

describe(`Given a non epub archive with several nested folders under the same parent`, () => {
  it(`should not duplicate entries when merging into an existing parent`, async () => {
    const archive = createArchive({
      filename: `archive`,
      records: [
        textRecord(`Part 1/Chapter 1/1.jpg`),
        textRecord(`Part 1/Chapter 1/2.jpg`),
        textRecord(`Part 1/Chapter 2/1.jpg`),
      ],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual([
      {
        contents: [
          {
            contents: [],
            containerHref: `Part%201/Chapter%201/1.jpg`,
            path: `Part 1/Chapter 1/1.jpg`,
            title: `Chapter 1`,
          },
          {
            contents: [],
            containerHref: `Part%201/Chapter%202/1.jpg`,
            path: `Part 1/Chapter 2/1.jpg`,
            title: `Chapter 2`,
          },
        ],
        containerHref: `Part%201/Chapter%201/1.jpg`,
        path: `Part 1/Chapter 1/1.jpg`,
        title: `Part 1`,
      },
    ])
  })
})

describe(`Given filenames carrying reserved URI delimiters`, () => {
  it(`should percent-encode # and ? in containerHref while keeping path raw`, async () => {
    const archive = createArchive({
      filename: `archive`,
      records: [textRecord(`folder x/page #1?.jpg`)],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual([
      {
        contents: [],
        containerHref: `folder%20x/page%20%231%3F.jpg`,
        path: `folder x/page #1?.jpg`,
        title: `folder x`,
      },
    ])
  })
})

describe(`Given a non epub archive without folders`, () => {
  it(`should not resolve any toc`, async () => {
    const archive = createArchive({
      filename: `archive`,
      records: [textRecord(`1.jpg`), textRecord(`2.jpg`)],
      close: () => Promise.resolve(),
    })

    expect(await resolveArchiveToc(archive)).toEqual(undefined)
  })
})
