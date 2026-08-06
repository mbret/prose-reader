import { describe, expect, it } from "vitest"
import { createArchive } from "../../archives/createArchive"
import { blobFileAccessors } from "../../archives/fileAccessors"
import { readArchiveComicInfo } from "./readArchiveComicInfo"

const textRecord = (uri: string, content = ``) => ({
  dir: false,
  basename: uri.split(`/`).pop() ?? uri,
  uri,
  size: content.length,
  ...blobFileAccessors(() => Promise.resolve(new Blob([content]))),
})

const archiveWith = (records: ReturnType<typeof textRecord>[]) =>
  createArchive({
    filename: `archive`,
    records,
    close: () => Promise.resolve(),
  })

describe(`readArchiveComicInfo`, () => {
  it(`should discover, read and parse the sidecar (case-insensitive basename)`, async () => {
    const archive = archiveWith([
      textRecord(`page_001.jpg`),
      textRecord(
        `comicinfo.xml`,
        `<?xml version="1.0"?><ComicInfo><Title>Vol 1</Title><Manga>YesAndRightToLeft</Manga></ComicInfo>`,
      ),
    ])

    const comicInfo = await readArchiveComicInfo(archive)

    expect(comicInfo).toEqual({
      kind: `comicInfo`,
      Title: `Vol 1`,
      Manga: `YesAndRightToLeft`,
    })
  })

  it(`should return undefined when there is no sidecar`, async () => {
    const archive = archiveWith([textRecord(`page_001.jpg`)])

    expect(await readArchiveComicInfo(archive)).toBeUndefined()
  })

  it(`should throw on malformed content`, async () => {
    const archive = archiveWith([textRecord(`ComicInfo.xml`, `not xml`)])

    await expect(readArchiveComicInfo(archive)).rejects.toThrow(
      /ComicInfo\.xml is malformed/,
    )
  })
})
