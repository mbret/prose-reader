import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import { createArchiveFromUrls } from "../../archives/createArchiveFromUrls"
import type { Archive } from "../../archives/types"
import {
  buildImageWrapperIdFromOriginalUri,
  buildImageWrapperResourcePathFromOriginalUri,
  decodeImageWrapperIdToOriginalUri,
  IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
} from "../../cbz/pageSpreadSplitManifest"
import { generateManifestFromArchive } from "./index"

const fakeContent = {
  blob: () => Promise.resolve(new Blob([])),
  string: () => Promise.resolve(""),
}

describe(`Given a list of urls archive`, () => {
  it(`should return a valid pre-paginated manifest`, async () => {
    const archive = await createArchiveFromUrls([
      `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`,
    ])

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
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
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
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
    const archive = await createArchiveFromUrls(
      [
        `https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg`,
      ],
      {
        useRenditionFlow: true,
      },
    )

    const manifest = await generateManifestFromArchive(archive)

    expect(manifest).toEqual({
      filename: ``,
      items: [
        {
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
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
          href: "https://cdn.epico.ink/public/YZ9LX5/en/PD2BXS/3mkdhqqhqhzia568079abhh01642468406498.jpg",
          id: "3mkdhqqhqhzia568079abhh01642468406498.jpg",
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

    const wrapperId = buildImageWrapperIdFromOriginalUri("Chapter 1/page_1.jpg")

    expect(manifest.spineItems).toEqual([
      {
        href: encodeURI(
          `file://${buildImageWrapperResourcePathFromOriginalUri({
            originalUri: "Chapter 1/page_1.jpg",
          })}`,
        ),
        id: wrapperId,
        index: 0,
        mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])

    expect(decodeImageWrapperIdToOriginalUri(wrapperId)).toBe(
      "Chapter 1/page_1.jpg",
    )
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
  it("should expose image spine items through pre-paginated XHTML wrappers", async () => {
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

    const wrapperId = buildImageWrapperIdFromOriginalUri("page_1.jpeg")

    expect(manifest.spineItems).toEqual([
      {
        href: encodeURI(
          `file://${buildImageWrapperResourcePathFromOriginalUri({
            originalUri: "page_1.jpeg",
          })}`,
        ),
        id: wrapperId,
        index: 0,
        mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1,
        renditionLayout: "pre-paginated",
      },
    ])
  })
})

describe("Given a non-epub image archive with a two-page spread filename", () => {
  it("should expose one reflowable paginated wrapper spine item for the spread", async () => {
    const spreadBasename = "p006-007 [dig] [Seven Seas] [danke-Empire] {HQ}.jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "p005.jpg",
          uri: "p005.jpg",
          dir: false,
          size: 1,
          encodingFormat: "image/jpeg",
        },
        {
          ...fakeContent,
          basename: spreadBasename,
          uri: spreadBasename,
          dir: false,
          size: 2,
          encodingFormat: "image/jpeg",
        },
        {
          ...fakeContent,
          basename: "p008.jpg",
          uri: "p008.jpg",
          dir: false,
          size: 1,
          encodingFormat: "image/jpeg",
        },
      ],
      close: () => Promise.resolve(),
    }

    const manifest = await generateManifestFromArchive(archive)
    const page005Id = buildImageWrapperIdFromOriginalUri("p005.jpg")
    const spreadId = buildImageWrapperIdFromOriginalUri(spreadBasename)
    const page008Id = buildImageWrapperIdFromOriginalUri("p008.jpg")

    expect(manifest.spineItems).toEqual([
      {
        href: encodeURI(
          `file://${buildImageWrapperResourcePathFromOriginalUri({
            originalUri: "p005.jpg",
          })}`,
        ),
        id: page005Id,
        index: 0,
        mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1 / 3,
        renditionLayout: "pre-paginated",
      },
      {
        href: encodeURI(
          `file://${buildImageWrapperResourcePathFromOriginalUri({
            originalUri: spreadBasename,
          })}`,
        ),
        id: spreadId,
        index: 1,
        mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1 / 3,
        renditionFlow: "paginated",
        renditionLayout: "reflowable",
      },
      {
        href: encodeURI(
          `file://${buildImageWrapperResourcePathFromOriginalUri({
            originalUri: "p008.jpg",
          })}`,
        ),
        id: page008Id,
        index: 2,
        mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        progressionWeight: 1 / 3,
        renditionLayout: "pre-paginated",
      },
    ])

    expect(manifest.items).toContainEqual({
      href: encodeURI(
        `file://${buildImageWrapperResourcePathFromOriginalUri({
          originalUri: spreadBasename,
        })}`,
      ),
      id: spreadId,
      mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
    })
  })

  it("should keep one spread spine item for RTL manga", async () => {
    const spreadBasename = "p006-007.jpg"
    const archive: Archive = {
      filename: "",
      records: [
        {
          ...fakeContent,
          basename: "ComicInfo.xml",
          uri: "ComicInfo.xml",
          dir: false,
          size: 1,
          string: () =>
            Promise.resolve(
              `<ComicInfo><Manga>YesAndRightToLeft</Manga></ComicInfo>`,
            ),
        },
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
    const spreadId = buildImageWrapperIdFromOriginalUri(spreadBasename)

    expect(manifest.readingDirection).toBe("rtl")
    expect(manifest.spineItems).toMatchObject([
      {
        id: spreadId,
        pageSpreadLeft: undefined,
        pageSpreadRight: undefined,
        renditionFlow: "paginated",
        renditionLayout: "reflowable",
      },
    ])
  })

  it("should create virtual hrefs when baseUrl has no trailing slash", async () => {
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
    const baseUrl = "http://localhost:9000/streamer/book"
    const resourcePath = buildImageWrapperResourcePathFromOriginalUri({
      originalUri: spreadBasename,
    })

    const manifest = await generateManifestFromArchive(archive, { baseUrl })

    expect(manifest.spineItems).toMatchObject([
      {
        href: encodeURI(`${baseUrl}/${resourcePath}`),
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
        id: "0.track_1.mp3",
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
