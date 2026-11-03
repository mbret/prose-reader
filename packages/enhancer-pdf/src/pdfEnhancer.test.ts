/* @vitest-environment happy-dom */

import { createArchive } from "@prose-reader/archive-reader"
import { createReader, type Manifest } from "@prose-reader/core"
import { lastValueFrom, type Observable, of } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pdfEnhancer } from "./pdfEnhancer"

const chapterItem: Manifest["items"][number] = {
  id: `chapter`,
  href: `http://localhost/chapter.xhtml`,
  mediaType: `application/xhtml+xml`,
}

const manifest: Manifest = {
  filename: `book.epub`,
  mediaType: `application/epub+zip`,
  title: `book`,
  renditionLayout: `reflowable`,
  renditionSpread: undefined,
  readingDirection: `ltr`,
  spineItems: [{ ...chapterItem, index: 0, containerUri: `chapter.xhtml` }],
  items: [chapterItem],
}

const createReaderGivenGetResource = (
  archiveForItem: Parameters<typeof createArchive>[0] | undefined,
) => {
  const chapterResponse = new Response(`<html></html>`)
  const getResourceGiven = vi.fn(() => of(chapterResponse))
  const reader = pdfEnhancer(createReader)({
    manifest,
    getResource: getResourceGiven,
    pdf: {
      pdfjsViewerInlineCss: ``,
      getArchiveForItem: () =>
        of(archiveForItem ? createArchive(archiveForItem) : undefined),
    },
  })

  return { reader, chapterResponse, getResourceGiven }
}

const resourceFrom = (
  resource$: Observable<unknown> | undefined,
): Promise<unknown> => lastValueFrom(resource$ ?? of(undefined))

describe(`pdfEnhancer`, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it(`leaves an item it has no pdf archive for to the getResource the reader was given`, async () => {
    const { reader, chapterResponse, getResourceGiven } =
      createReaderGivenGetResource(undefined)

    const resource = await resourceFrom(
      reader.settings.values.getResource?.(chapterItem),
    )

    expect(resource).toBe(chapterResponse)
    expect(getResourceGiven).toHaveBeenCalledWith(chapterItem)

    reader.destroy()
  })

  it(`leaves an item whose archive is not a pdf to the getResource the reader was given, with a warning`, async () => {
    const warn = vi.spyOn(console, `warn`).mockImplementation(() => undefined)
    const { reader, chapterResponse } = createReaderGivenGetResource({
      filename: `book.epub`,
      records: [],
      close: () => Promise.resolve(),
    })

    const resource = await resourceFrom(
      reader.settings.values.getResource?.(chapterItem),
    )

    expect(resource).toBe(chapterResponse)
    expect(warn).toHaveBeenCalledWith(`You provided an invalid pdf archive`)

    reader.destroy()
  })
})
