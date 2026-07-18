import { describe, expect, it } from "vitest"
import { createArchive } from "../archives/createArchive"
import { blobFileAccessors } from "../archives/fileAccessors"
import { readArchiveKobo } from "./readArchiveKobo"

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

const FIXED_LAYOUT = `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`
const NOT_FIXED_LAYOUT = `<display_options><platform name="*"><option name="fixed-layout">false</option></platform></display_options>`

describe(`readArchiveKobo`, () => {
  it(`should discover, read and parse a display options file anywhere in the container`, async () => {
    const archive = archiveWith([
      textRecord(`OEBPS/ch1.xhtml`),
      textRecord(`META-INF/com.kobobooks.display-options.xml`, FIXED_LAYOUT),
    ])

    expect(await readArchiveKobo(archive)).toEqual({
      kind: `kobo`,
      renditionLayout: `pre-paginated`,
    })
  })

  it(`should return undefined when there is no kobo file`, async () => {
    const archive = archiveWith([textRecord(`OEBPS/ch1.xhtml`)])

    expect(await readArchiveKobo(archive)).toBeUndefined()
  })

  it(`should keep the last parsed value when several files match`, async () => {
    const archive = archiveWith([
      textRecord(`a/com.kobobooks.display-options.xml`, NOT_FIXED_LAYOUT),
      textRecord(`b/com.kobobooks.display-options.xml`, FIXED_LAYOUT),
    ])

    expect(await readArchiveKobo(archive)).toEqual({
      kind: `kobo`,
      renditionLayout: `pre-paginated`,
    })
  })

  it(`should skip malformed files instead of throwing`, async () => {
    const archive = archiveWith([
      textRecord(`a/com.kobobooks.display-options.xml`, FIXED_LAYOUT),
      textRecord(`b/com.kobobooks.display-options.xml`, `not xml`),
    ])

    expect(await readArchiveKobo(archive)).toEqual({
      kind: `kobo`,
      renditionLayout: `pre-paginated`,
    })
  })
})
