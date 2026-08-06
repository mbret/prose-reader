import { describe, expect, it } from "vitest"
import { createArchive } from "../../archives/createArchive"
import { blobFileAccessors } from "../../archives/fileAccessors"
import { readArchiveApple } from "./readArchiveApple"

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

describe(`readArchiveApple`, () => {
  it(`should discover, read and parse the display options anywhere in the container`, async () => {
    const archive = archiveWith([
      textRecord(`OEBPS/ch1.xhtml`),
      textRecord(
        `META-INF/com.apple.ibooks.display-options.xml`,
        `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`,
      ),
    ])

    const apple = await readArchiveApple(archive)

    expect(apple).toEqual({
      kind: `apple`,
      displayOptions: {
        platform: {
          options: [{ name: `fixed-layout`, value: `true` }],
        },
      },
    })
  })

  it(`should match the basename case-insensitively`, async () => {
    const archive = archiveWith([
      textRecord(
        `META-INF/COM.APPLE.IBOOKS.DISPLAY-OPTIONS.XML`,
        `<display_options></display_options>`,
      ),
    ])

    expect(await readArchiveApple(archive)).toEqual({
      kind: `apple`,
      displayOptions: {},
    })
  })

  it(`should return undefined when there is no display options file`, async () => {
    const archive = archiveWith([textRecord(`OEBPS/ch1.xhtml`)])

    expect(await readArchiveApple(archive)).toBeUndefined()
  })

  it(`should throw on malformed content`, async () => {
    const archive = archiveWith([
      textRecord(`com.apple.ibooks.display-options.xml`, `not xml`),
    ])

    await expect(readArchiveApple(archive)).rejects.toThrow()
  })
})
