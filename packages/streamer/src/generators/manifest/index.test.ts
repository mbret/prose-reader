import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { createArchiveFromUrls } from "../../archives/createArchiveFromUrls"
import type { Archive } from "../../archives/types"
import { createXmlSafeId } from "../../utils/createXmlSafeId"
import { generateManifestFromArchive } from "./index"

const fakeContent = {
  blob: () => Promise.resolve(new Blob([])),
  string: () => Promise.resolve(""),
}

describe(`Given a list of urls archive`, () => {
  it(`should return a valid pre-paginated manifest`, async () => {
    const imageUrl = `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`
    const imageId = createXmlSafeId(imageUrl)
    const archive = await createArchiveFromUrls([imageUrl])

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: imageUrl,
          id: imageId,
          mediaType: `image/jpg`,
        },
      ],
      nav: {
        toc: [],
      },
      readingDirection: "ltr",
      renditionLayout: "pre-paginated",
      renditionFlow: `auto`,
      spineItems: [
        {
          href: imageUrl,
          id: imageId,
          progressionWeight: 1,
          renditionLayout: "pre-paginated",
          mediaType: `image/jpg`,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          index: 0,
        },
      ],
      title: "",
      renditionSpread: undefined,
    } satisfies Manifest)
  })
})

describe(`Given a list of urls with rendition flow archive`, () => {
  it(`should return a valid reflowable manifest`, async () => {
    const imageUrl = `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`
    const imageId = createXmlSafeId(imageUrl)
    const archive = await createArchiveFromUrls([imageUrl], {
      useRenditionFlow: true,
    })

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: imageUrl,
          id: imageId,
          mediaType: `image/jpg`,
        },
      ],
      nav: {
        toc: [],
      },
      readingDirection: "ltr",
      renditionLayout: "reflowable",
      renditionFlow: `scrolled-continuous`,
      spineItems: [
        {
          href: imageUrl,
          id: imageId,
          progressionWeight: 1,
          renditionLayout: "reflowable",
          mediaType: `image/jpg`,
          pageSpreadLeft: undefined,
          pageSpreadRight: undefined,
          index: 0,
        },
      ],
      title: "",
      renditionSpread: undefined,
    } satisfies Manifest)
  })
})

describe("Given archive with a folder containing a space", () => {
  const fakeContent = {
    blob: () => Promise.resolve(new Blob([])),
    string: () => Promise.resolve(""),
  }

  it("should encode space but not the slash", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "Chapter 1/",
          uri: "Chapter 1/",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems).toEqual([
      {
        href: "file://Chapter%201/page_1.jpg",
        id: createXmlSafeId("Chapter 1/page_1.jpg"),
        index: 0,
        mediaType: undefined,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })

  it("should derive unique XML-safe IDs from the archive resource path", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 2/page_1.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems.map((item) => item.id)).toEqual([
      createXmlSafeId("Chapter 1/page_1.jpg"),
      createXmlSafeId("Chapter 2/page_1.jpg"),
    ])
    expect(manifest.items.map((item) => item.id)).toEqual([
      createXmlSafeId("Chapter 1/page_1.jpg"),
      createXmlSafeId("Chapter 2/page_1.jpg"),
    ])
  })

  it("should disambiguate generated ID collisions after sanitizing paths", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "page.jpg",
          uri: "Chapter 1/page.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page.jpg",
          uri: "Chapter_1/page.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems.map((item) => item.id)).toEqual([
      "Chapter_1_page.jpg",
      "Chapter_1_page.jpg-2",
    ])
  })
})

describe("Given archive with no folders", () => {
  it("should not create any toc", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "page_1.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.nav).toEqual(undefined)
  })
})

describe("Given non-epub image archive items with encodingFormat", () => {
  it("should keep image spine items pre-paginated", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "page_1.jpeg",
          uri: "page_1.jpeg",
          dir: false,
          size: 1,
          encodingFormat: "image/jpeg",
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems).toEqual([
      {
        href: "file://page_1.jpeg",
        id: "page_1.jpeg",
        index: 0,
        mediaType: "image/jpeg",
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })
})

describe("Given a non-epub image archive with a two-page spread filename", () => {
  it("should keep the original spine item without external streamer hooks", async () => {
    const spreadBasename = "p006-007.jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: spreadBasename,
          uri: spreadBasename,
          dir: false,
          size: 1,
          encodingFormat: "image/jpeg",
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems).toEqual([
      {
        href: "file://p006-007.jpg",
        id: "p006-007.jpg",
        index: 0,
        mediaType: "image/jpeg",
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })
})

describe("Given non-epub audio archive items with encodingFormat", () => {
  it("should mark audio spine items as pre-paginated", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "track_1.mp3",
          uri: "track_1.mp3",
          dir: false,
          size: 1,
          encodingFormat: "audio/mpeg",
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems).toEqual([
      {
        href: "file://track_1.mp3",
        id: "track_1.mp3",
        index: 0,
        mediaType: "audio/mpeg",
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })
})

describe("Given non-epub audio archive items without encodingFormat", () => {
  it("should detect audio from filename and mark as pre-paginated", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "track_1.mp3",
          uri: "track_1.mp3",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest.spineItems[0]?.renditionLayout).toBe("pre-paginated")
  })
})

describe("Given archive with folders", () => {
  it("should run spine hooks after content normalization and before derived metadata", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "Chapter 1/",
          uri: "Chapter 1/",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          encodingFormat: "image/jpeg",
          size: 1,
        },
        {
          ...fakeContent,
          basename: "com.kobobooks.display-options.xml",
          uri: "com.kobobooks.display-options.xml",
          dir: false,
          size: 1,
          string: () =>
            Promise.resolve(
              `<display_options><platform name="*"><option name="fixed-layout">true</option></platform></display_options>`,
            ),
        },
      ],
      close: () => Promise.resolve(),
    }
    const stateSeenByHook: Array<{
      nav: Manifest["nav"]
      renditionLayout: Manifest["renditionLayout"]
      spineItemRenditionLayout: Manifest["spineItems"][number]["renditionLayout"]
    }> = []

    const manifest = await generateManifestFromArchive(archive, {
      hooks: {
        spine: [
          () => async (manifest) => {
            stateSeenByHook.push({
              nav: manifest.nav,
              renditionLayout: manifest.renditionLayout,
              spineItemRenditionLayout: manifest.spineItems[0]?.renditionLayout,
            })

            return manifest
          },
        ],
      },
    })

    expect(stateSeenByHook).toEqual([
      {
        nav: undefined,
        renditionLayout: undefined,
        spineItemRenditionLayout: "pre-paginated",
      },
    ])
    expect(manifest.renditionLayout).toBe("pre-paginated")
    expect(manifest.nav?.toc).toHaveLength(1)
  })

  it("should create correct toc", async () => {
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "Chapter 1/",
          uri: "Chapter 1/",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "Chapter 2",
          uri: "Chapter 2",
          dir: true,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_2.jpg",
          uri: "Chapter 1/page_2.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_1.jpg",
          uri: "Chapter 1/page_1.jpg",
          dir: false,
          size: 1,
        },
        {
          ...fakeContent,
          basename: "page_3.jpg",
          uri: "Chapter 4/page_3.jpg",
          dir: false,
          size: 1,
        },
      ],
      close: () => Promise.resolve(),
    }

    const baseUrl = "http://localhost:9000"

    const manifest = await generateManifestFromArchive(archive, { baseUrl })

    expect(manifest.nav).toEqual({
      toc: [
        {
          contents: [],
          href: `${baseUrl}/Chapter%201/page_1.jpg`,
          path: "Chapter 1/page_1.jpg",
          title: "Chapter 1",
        },
        {
          contents: [],
          href: `${baseUrl}/Chapter%204/page_3.jpg`,
          path: "Chapter 4/page_3.jpg",
          title: "Chapter 4",
        },
      ],
    })
  })
})
