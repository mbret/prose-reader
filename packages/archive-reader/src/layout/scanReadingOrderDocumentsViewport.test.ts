import { describe, expect, it } from "vitest"
import { createArchive } from "../archives/createArchive"
import { blobFileAccessors } from "../archives/fileAccessors"
import { readingOrderDocumentsAllHaveViewport } from "./scanReadingOrderDocumentsViewport"

const xhtml = (viewport: boolean) =>
  `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Page</title>
    ${viewport ? `<meta name="viewport" content="width=1200, height=600" />` : ``}
  </head>
  <body><p>content</p></body>
</html>`

const textRecord = (uri: string, content = ``, encodingFormat?: string) => ({
  dir: false,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: content.length,
  ...(encodingFormat !== undefined ? { encodingFormat } : {}),
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
})

const archiveWith = (records: ReturnType<typeof textRecord>[]) =>
  createArchive({
    filename: `archive`,
    records,
    close: () => Promise.resolve(),
  })

const xhtmlItem = (uri: string) => ({
  uri,
  mediaType: `application/xhtml+xml`,
  progressionWeight: 1,
})

describe(`readingOrderDocumentsAllHaveViewport`, () => {
  it(`is true when every document is XML-based with a viewport`, async () => {
    const archive = archiveWith([
      textRecord(`p1.xhtml`, xhtml(true), `application/xhtml+xml`),
      textRecord(`p2.xhtml`, xhtml(true), `application/xhtml+xml`),
    ])

    expect(
      await readingOrderDocumentsAllHaveViewport(archive, [
        xhtmlItem(`p1.xhtml`),
        xhtmlItem(`p2.xhtml`),
      ]),
    ).toBe(true)
  })

  it(`is false when one document lacks the viewport`, async () => {
    const archive = archiveWith([
      textRecord(`p1.xhtml`, xhtml(true), `application/xhtml+xml`),
      textRecord(`p2.xhtml`, xhtml(false), `application/xhtml+xml`),
    ])

    expect(
      await readingOrderDocumentsAllHaveViewport(archive, [
        xhtmlItem(`p1.xhtml`),
        xhtmlItem(`p2.xhtml`),
      ]),
    ).toBe(false)
  })

  it(`is false when one entry is not XML-based`, async () => {
    const archive = archiveWith([
      textRecord(`p1.xhtml`, xhtml(true), `application/xhtml+xml`),
      textRecord(`p2.jpg`, ``, `image/jpeg`),
    ])

    expect(
      await readingOrderDocumentsAllHaveViewport(archive, [
        xhtmlItem(`p1.xhtml`),
        { uri: `p2.jpg`, mediaType: `image/jpeg`, progressionWeight: 1 },
      ]),
    ).toBe(false)
  })

  it(`is false on an empty reading order`, async () => {
    expect(
      await readingOrderDocumentsAllHaveViewport(archiveWith([]), []),
    ).toBe(false)
  })

  it(`is false when a document is missing from the archive`, async () => {
    const archive = archiveWith([
      textRecord(`p1.xhtml`, xhtml(true), `application/xhtml+xml`),
    ])

    expect(
      await readingOrderDocumentsAllHaveViewport(archive, [
        xhtmlItem(`p1.xhtml`),
        xhtmlItem(`missing.xhtml`),
      ]),
    ).toBe(false)
  })

  it(`is false instead of throwing when a document is not parseable XML`, async () => {
    const archive = archiveWith([
      textRecord(`p1.xhtml`, `not xml at all`, `application/xhtml+xml`),
    ])

    expect(
      await readingOrderDocumentsAllHaveViewport(archive, [
        xhtmlItem(`p1.xhtml`),
      ]),
    ).toBe(false)
  })
})
