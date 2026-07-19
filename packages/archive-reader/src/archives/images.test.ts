import { describe, expect, it } from "vitest"
import { createArchive } from "./createArchive"
import { blobFileAccessors } from "./fileAccessors"
import { getArchiveImageRecords, isImageRecord } from "./images"
import type { ArchiveRecord } from "./types"

const fileRecord = (
  uri: string,
  { encodingFormat }: { encodingFormat?: string } = {},
): ArchiveRecord => ({
  dir: false,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: 0,
  ...(encodingFormat !== undefined ? { encodingFormat } : {}),
  ...blobFileAccessors(() => Promise.resolve(new Blob([]))),
})

const dirRecord = (uri: string): ArchiveRecord => ({
  dir: true,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
})

describe(`isImageRecord`, () => {
  it(`detects an image by encoding format`, () => {
    expect(
      isImageRecord(fileRecord(`p1`, { encodingFormat: `image/avif` })),
    ).toBe(true)
  })

  it(`detects an image by filename when the encoding format is absent`, () => {
    // covers the raster formats detectMimeTypeFromName recognizes, including
    // the ones it gained (gif/avif/bmp/tiff)
    expect(isImageRecord(fileRecord(`page.gif`))).toBe(true)
    expect(isImageRecord(fileRecord(`page.tiff`))).toBe(true)
    expect(isImageRecord(fileRecord(`COVER.JPG`))).toBe(true)
  })

  it(`is false for non-image files and directories`, () => {
    expect(isImageRecord(fileRecord(`chapter.xhtml`))).toBe(false)
    expect(isImageRecord(fileRecord(`track.mp3`))).toBe(false)
    expect(isImageRecord(fileRecord(`content.opf`))).toBe(false)
    expect(isImageRecord(dirRecord(`Images`))).toBe(false)
  })
})

describe(`getArchiveImageRecords`, () => {
  it(`returns the image file records in record order, skipping the rest`, () => {
    const archive = createArchive({
      filename: `comic.cbz`,
      records: [
        dirRecord(`Images`),
        fileRecord(`ComicInfo.xml`, { encodingFormat: `application/xml` }),
        fileRecord(`Images/001.jpg`, { encodingFormat: `image/jpeg` }),
        fileRecord(`Images/notes.txt`),
        fileRecord(`Images/002.avif`),
      ],
      close: () => Promise.resolve(),
    })

    expect(getArchiveImageRecords(archive).map((record) => record.uri)).toEqual(
      [`Images/001.jpg`, `Images/002.avif`],
    )
  })
})
