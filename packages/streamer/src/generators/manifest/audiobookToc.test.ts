import { blobFileAccessors, createArchive } from "@prose-reader/archive-reader"
import { describe, expect, it } from "vitest"
import { buildAudiobookToc, normalizeFilenameAsTitle } from "./audiobookToc"
import { generateManifestFromArchive } from "./index"

describe("normalizeFilenameAsTitle", () => {
  it.each([
    ["track_01_introduction.mp3", "track 01 introduction"],
    ["01-chapter-one.mp3", "01 chapter one"],
    ["Chapter 1.mp3", "Chapter 1"],
    ["my_file.name.mp3", "my file.name"],
    ["  spaced__out--name.ogg  ", "spaced out name"],
  ])("should normalize %s to %s", (input, expected) => {
    expect(normalizeFilenameAsTitle(input)).toBe(expected)
  })
})

describe("buildAudiobookToc", () => {
  const baseManifest = {
    filename: "",
    mediaType: "application/zip",
    items: [],
    readingDirection: "ltr" as const,
    renditionLayout: "pre-paginated" as const,
    renditionSpread: "auto" as const,
    title: "",
  }

  it("should return undefined for empty spine", () => {
    const result = buildAudiobookToc({ ...baseManifest, spineItems: [] })

    expect(result).toBeUndefined()
  })

  it("should return undefined when not all spine items are audio", () => {
    const result = buildAudiobookToc({
      ...baseManifest,
      spineItems: [
        {
          id: "0",
          index: 0,
          href: "file://page.xhtml",
          containerUri: "page.xhtml",
          mediaType: "application/xhtml+xml",
        },
        {
          id: "1",
          index: 1,
          href: "file://track.mp3",
          containerUri: "track.mp3",
          mediaType: "audio/mpeg",
        },
      ],
    })

    expect(result).toBeUndefined()
  })

  it("should build per-track toc from audio spine items", () => {
    const result = buildAudiobookToc({
      ...baseManifest,
      spineItems: [
        {
          id: "0",
          index: 0,
          href: "http://localhost/01_introduction.mp3",
          containerUri: "01_introduction.mp3",
          mediaType: "audio/mpeg",
        },
        {
          id: "1",
          index: 1,
          href: "http://localhost/02_chapter-one.mp3",
          containerUri: "02_chapter-one.mp3",
          mediaType: "audio/mpeg",
        },
      ],
    })

    expect(result).toEqual([
      {
        title: "01 introduction",
        href: "http://localhost/01_introduction.mp3",
        path: "01_introduction.mp3",
        contents: [],
      },
      {
        title: "02 chapter one",
        href: "http://localhost/02_chapter-one.mp3",
        path: "02_chapter-one.mp3",
        contents: [],
      },
    ])
  })
})

describe("audiobook toc through manifest generation", () => {
  const fakeContent = blobFileAccessors(() => Promise.resolve(new Blob()))

  it("should prefer per-track toc over folder toc for audiobooks", async () => {
    const archive = createArchive({
      filename: "audiobook.zip",
      close: async () => {},
      records: [
        {
          ...fakeContent,
          basename: "disc1/",
          uri: "disc1/",
          dir: true,
        },
        {
          ...fakeContent,
          basename: "track_01.mp3",
          uri: "disc1/track_01.mp3",
          dir: false,
          size: 1,
          encodingFormat: "audio/mpeg",
        },
      ],
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.nav).toEqual({
      toc: [
        {
          title: "track 01",
          href: "file://disc1/track_01.mp3",
          path: "disc1/track_01.mp3",
          contents: [],
        },
      ],
    })
  })

  it("names each track after its own record, when one record's path ends another's", async () => {
    const audioRecord = (uri: string) => ({
      ...fakeContent,
      basename: uri.split("/").pop() ?? uri,
      uri,
      dir: false as const,
      size: 1,
      encodingFormat: "audio/mpeg",
    })
    // Each first record's path is the end of the second's.
    const archive = createArchive({
      filename: "audiobook.zip",
      close: async () => {},
      records: [
        audioRecord("01.mp3"),
        audioRecord("CD2/01.mp3"),
        audioRecord("chapter 1.mp3"),
        audioRecord("extra chapter 1.mp3"),
      ],
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(
      manifest.nav?.toc.map(({ title, path }) => ({ title, path })),
    ).toEqual([
      { title: "01", path: "01.mp3" },
      { title: "01", path: "CD2/01.mp3" },
      { title: "chapter 1", path: "chapter 1.mp3" },
      { title: "extra chapter 1", path: "extra chapter 1.mp3" },
    ])
  })

  it("should fall back to folder toc when not all spine items are audio", async () => {
    const archive = createArchive({
      filename: "mixed.zip",
      close: async () => {},
      records: [
        {
          ...fakeContent,
          basename: "chapter/",
          uri: "chapter/",
          dir: true,
        },
        {
          ...fakeContent,
          basename: "page.xhtml",
          uri: "chapter/page.xhtml",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "track.mp3",
          uri: "chapter/track.mp3",
          dir: false,
          size: 1,
          encodingFormat: "audio/mpeg",
        },
      ],
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.nav?.toc[0]?.title).toBe("chapter")
  })
})
