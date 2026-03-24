import { describe, expect, it } from "vitest"
import { buildAudiobookToc, normalizeFilenameAsTitle } from "./audiobookToc"
import { tocHook } from "./toc"

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
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  const fakeContent = {
    blob: () => Promise.resolve({} as any),
    string: () => Promise.resolve(""),
  }

  const baseManifest = {
    filename: "",
    items: [],
    readingDirection: "ltr" as const,
    renditionLayout: "pre-paginated" as const,
    renditionSpread: "auto" as const,
    title: "",
  }

  it("should return undefined for empty spine", () => {
    const result = buildAudiobookToc(
      { ...baseManifest, spineItems: [] },
      { filename: "", close: async () => {}, records: [] },
    )

    expect(result).toBeUndefined()
  })

  it("should return undefined when not all spine items are audio", () => {
    const result = buildAudiobookToc(
      {
        ...baseManifest,
        spineItems: [
          {
            id: "0",
            index: 0,
            href: "file://page.xhtml",
            mediaType: "application/xhtml+xml",
          },
          {
            id: "1",
            index: 1,
            href: "file://track.mp3",
            mediaType: "audio/mpeg",
          },
        ],
      },
      { filename: "", close: async () => {}, records: [] },
    )

    expect(result).toBeUndefined()
  })

  it("should build per-track toc from audio spine items", () => {
    const result = buildAudiobookToc(
      {
        ...baseManifest,
        spineItems: [
          {
            id: "0",
            index: 0,
            href: "http://localhost/01_introduction.mp3",
            mediaType: "audio/mpeg",
          },
          {
            id: "1",
            index: 1,
            href: "http://localhost/02_chapter-one.mp3",
            mediaType: "audio/mpeg",
          },
        ],
      },
      {
        filename: "audiobook.zip",
        close: async () => {},
        records: [
          {
            ...fakeContent,
            basename: "01_introduction.mp3",
            uri: "01_introduction.mp3",
            dir: false,
            size: 1,
            encodingFormat: "audio/mpeg",
          },
          {
            ...fakeContent,
            basename: "02_chapter-one.mp3",
            uri: "02_chapter-one.mp3",
            dir: false,
            size: 1,
            encodingFormat: "audio/mpeg",
          },
        ],
      },
    )

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

describe("tocHook with audiobook", () => {
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  const fakeContent = {
    blob: () => Promise.resolve({} as any),
    string: () => Promise.resolve(""),
  }

  const baseManifest = {
    filename: "",
    items: [],
    readingDirection: "ltr" as const,
    renditionLayout: "pre-paginated" as const,
    renditionSpread: "auto" as const,
    title: "",
  }

  it("should prefer per-track toc over folder toc for audiobooks", async () => {
    const archive = {
      filename: "audiobook.zip",
      close: async () => {},
      records: [
        {
          ...fakeContent,
          basename: "disc1/",
          uri: "disc1/",
          dir: true,
          size: 0,
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
    }

    const manifest = await tocHook({ archive, baseUrl: "" })({
      ...baseManifest,
      spineItems: [
        {
          id: "0",
          index: 0,
          href: "file://disc1/track_01.mp3",
          mediaType: "audio/mpeg",
        },
      ],
    })

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

  it("should fall back to folder toc when not all spine items are audio", async () => {
    const archive = {
      filename: "mixed.zip",
      close: async () => {},
      records: [
        {
          ...fakeContent,
          basename: "chapter/",
          uri: "chapter/",
          dir: true,
          size: 0,
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
    }

    const manifest = await tocHook({ archive, baseUrl: "" })({
      ...baseManifest,
      spineItems: [
        {
          id: "0",
          index: 0,
          href: "file://chapter/page.xhtml",
          mediaType: "application/xhtml+xml",
        },
        {
          id: "1",
          index: 1,
          href: "file://chapter/track.mp3",
          mediaType: "audio/mpeg",
        },
      ],
    })

    expect(manifest.nav?.toc[0]?.title).toBe("chapter")
  })
})
