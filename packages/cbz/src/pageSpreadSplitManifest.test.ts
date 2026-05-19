import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "@prose-reader/streamer"
import { describe, expect, it } from "vitest"
import {
  buildVirtualPageSpreadResourcePath,
  isPageSpreadSplitSupportedArchiveRecord,
  PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
  pageSpreadSplit,
} from "./pageSpreadSplitManifest"

const fakeContent = {
  blob: () => Promise.resolve(new Blob([])),
  string: () => Promise.resolve(""),
}

const createManifest = ({
  href,
  id,
  mediaType,
}: {
  href: string
  id: string
  mediaType: string | undefined
}): Manifest => ({
  filename: "",
  items: [{ href, id, mediaType }],
  readingDirection: "ltr",
  renditionLayout: "pre-paginated",
  renditionSpread: undefined,
  spineItems: [
    {
      href,
      id,
      index: 0,
      mediaType,
      progressionWeight: 1,
      renditionLayout: "pre-paginated",
    },
  ],
  title: "",
})

const createArchive = (records: Archive["records"]): Archive => ({
  close: () => Promise.resolve(),
  filename: "",
  records,
})

describe("isPageSpreadSplitSupportedArchiveRecord", () => {
  it("should require an image resource path", () => {
    expect(
      isPageSpreadSplitSupportedArchiveRecord({
        ...fakeContent,
        basename: "p002-003.txt",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: "p002-003.txt",
      }),
    ).toBe(false)
  })

  it("should accept supported image resource paths", () => {
    expect(
      isPageSpreadSplitSupportedArchiveRecord({
        ...fakeContent,
        basename: "p002-003.jpg",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: "p002-003.jpg",
      }),
    ).toBe(true)
  })
})

describe("pageSpreadSplit", () => {
  it("should expose two virtual pre-paginated spine items", async () => {
    const spreadBasename = "p006-007 [dig] [Seven Seas] [danke-Empire] {HQ}.jpg"
    const archive = createArchive([
      {
        ...fakeContent,
        basename: spreadBasename,
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: spreadBasename,
      },
    ])
    const manifest = createManifest({
      href: `file://${spreadBasename}`,
      id: spreadBasename,
      mediaType: "image/jpeg",
    })
    const leftResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "left",
      originalUri: spreadBasename,
    })
    const rightResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "right",
      originalUri: spreadBasename,
    })

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toMatchObject({
      spineItems: [
        {
          href: encodeURI(`file://${leftResourcePath}`),
          id: `${spreadBasename}.006`,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
          pageSpreadLeft: true,
          pageSpreadRight: undefined,
          progressionWeight: 1 / 2,
          renditionLayout: "pre-paginated",
        },
        {
          href: encodeURI(`file://${rightResourcePath}`),
          id: `${spreadBasename}.007`,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
          pageSpreadLeft: undefined,
          pageSpreadRight: true,
          progressionWeight: 1 / 2,
          renditionLayout: "pre-paginated",
        },
      ],
      items: [
        {
          href: `file://${spreadBasename}`,
          id: spreadBasename,
          mediaType: "image/jpeg",
        },
        {
          href: encodeURI(`file://${leftResourcePath}`),
          id: `${spreadBasename}.006`,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
        },
        {
          href: encodeURI(`file://${rightResourcePath}`),
          id: `${spreadBasename}.007`,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
        },
      ],
    })
  })

  it("should map the lower page to the right slot for RTL manga", async () => {
    const spreadBasename = "p006-007.jpg"
    const archive = createArchive([
      {
        ...fakeContent,
        basename: spreadBasename,
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: spreadBasename,
      },
    ])
    const manifest: Manifest = {
      ...createManifest({
        href: `file://${spreadBasename}`,
        id: spreadBasename,
        mediaType: "image/jpeg",
      }),
      readingDirection: "rtl",
    }

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toMatchObject({
      spineItems: [
        {
          id: `${spreadBasename}.006`,
          pageSpreadLeft: undefined,
          pageSpreadRight: true,
        },
        {
          id: `${spreadBasename}.007`,
          pageSpreadLeft: true,
          pageSpreadRight: undefined,
        },
      ],
    })
  })

  it("should not check archives containing an OPF file", async () => {
    const archive = createArchive([
      {
        ...fakeContent,
        basename: "CONTENT.OPF",
        dir: false,
        size: 1,
        uri: "OEBPS/CONTENT.OPF",
      },
      {
        ...fakeContent,
        basename: "p002-003.jpg",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: "p002-003.jpg",
      },
    ])
    const manifest = createManifest({
      href: "file://p002-003.jpg",
      id: "p002-003.jpg",
      mediaType: "image/jpeg",
    })

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toBe(manifest)
  })

  it("should not split matching non-image resource paths", async () => {
    const archive = createArchive([
      {
        ...fakeContent,
        basename: "p002-003.txt",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: "p002-003.txt",
      },
    ])
    const manifest = createManifest({
      href: "file://p002-003.txt",
      id: "p002-003.txt",
      mediaType: "image/jpeg",
    })

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toBe(manifest)
  })

  it("should match archive records by exact resource path instead of suffix", async () => {
    const nestedUri = "bonus/p006-007.jpg"
    const archive = createArchive([
      {
        ...fakeContent,
        basename: "p006-007.jpg",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: "p006-007.jpg",
      },
      {
        ...fakeContent,
        basename: "p006-007.jpg",
        dir: false,
        encodingFormat: "image/jpeg",
        size: 1,
        uri: nestedUri,
      },
    ])
    const manifest = createManifest({
      href: `file://${nestedUri}`,
      id: nestedUri,
      mediaType: "image/jpeg",
    })
    const leftResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "left",
      originalUri: nestedUri,
    })
    const rightResourcePath = buildVirtualPageSpreadResourcePath({
      cropSide: "right",
      originalUri: nestedUri,
    })

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toMatchObject({
      spineItems: [
        {
          href: encodeURI(`file://${leftResourcePath}`),
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
        },
        {
          href: encodeURI(`file://${rightResourcePath}`),
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
        },
      ],
    })
  })
})
