import type { Manifest } from "@prose-reader/shared"
import {
  type Archive,
  blobFileAccessors,
  createArchive as createStreamerArchive,
  createXmlSafeId,
} from "@prose-reader/streamer"
import { describe, expect, it } from "vitest"
import {
  buildVirtualPageSpreadResourcePath,
  isPageSpreadSplitSupportedArchiveRecord,
  PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
  pageSpreadSplit,
} from "./pageSpreadSplitManifest"

const fakeContent = blobFileAccessors(() => Promise.resolve(new Blob([])))

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

const createManifestFromResourceNames = ({
  readingDirection = "ltr",
  resourceNames,
}: {
  readingDirection?: Manifest["readingDirection"]
  resourceNames: string[]
}): Manifest => ({
  filename: "",
  items: resourceNames.map((resourceName) => ({
    href: `file://${resourceName}`,
    id: resourceName,
    mediaType: "image/jpeg",
  })),
  readingDirection,
  renditionLayout: "pre-paginated",
  renditionSpread: undefined,
  spineItems: resourceNames.map((resourceName, index) => ({
    href: `file://${resourceName}`,
    id: resourceName,
    index,
    mediaType: "image/jpeg",
    progressionWeight: 1 / resourceNames.length,
    renditionLayout: "pre-paginated",
  })),
  title: "",
})

const createArchive = (records: Archive["records"]): Archive =>
  createStreamerArchive({
    close: () => Promise.resolve(),
    filename: "",
    records,
  })

const createImageRecord = (
  resourceName: string,
): Archive["records"][number] => ({
  ...fakeContent,
  basename: resourceName,
  dir: false,
  encodingFormat: "image/jpeg",
  size: 1,
  uri: resourceName,
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
    const leftId = createXmlSafeId(`${spreadBasename}.006`)
    const rightId = createXmlSafeId(`${spreadBasename}.007`)

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toMatchObject({
      spineItems: [
        {
          href: encodeURI(`file://${leftResourcePath}`),
          id: leftId,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
          pageSpreadLeft: true,
          pageSpreadRight: undefined,
          progressionWeight: 1 / 2,
          renditionLayout: "pre-paginated",
        },
        {
          href: encodeURI(`file://${rightResourcePath}`),
          id: rightId,
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
          id: leftId,
          mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
        },
        {
          href: encodeURI(`file://${rightResourcePath}`),
          id: rightId,
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

  it("should shift RTL opening parity when the first split spread pair would otherwise be misaligned", async () => {
    const resourceNames = ["p001.jpg", "p002.jpg", "p003.jpg", "p004-005.jpg"]
    const archive = createArchive(resourceNames.map(createImageRecord))
    const manifest = createManifestFromResourceNames({
      readingDirection: "rtl",
      resourceNames,
    })

    const result = await pageSpreadSplit({ archive, baseUrl: "" })(manifest)

    expect(result.spineItems).toMatchObject([
      {
        id: "p001.jpg",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
      { id: "p002.jpg" },
      { id: "p003.jpg" },
      {
        id: "p004-005.jpg.004",
        pageSpreadLeft: undefined,
        pageSpreadRight: true,
      },
      {
        id: "p004-005.jpg.005",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
    ])
    expect(result.spineItems[1]?.pageSpreadLeft).toBeUndefined()
    expect(result.spineItems[1]?.pageSpreadRight).toBeUndefined()
    expect(result.spineItems[2]?.pageSpreadLeft).toBeUndefined()
    expect(result.spineItems[2]?.pageSpreadRight).toBeUndefined()
  })

  it("should shift LTR opening parity when the first split spread pair would otherwise be misaligned", async () => {
    const resourceNames = ["p001.jpg", "p002-003.jpg"]
    const archive = createArchive(resourceNames.map(createImageRecord))
    const manifest = createManifestFromResourceNames({
      readingDirection: "ltr",
      resourceNames,
    })

    const result = await pageSpreadSplit({ archive, baseUrl: "" })(manifest)

    expect(result.spineItems).toMatchObject([
      {
        id: "p001.jpg",
        pageSpreadLeft: undefined,
        pageSpreadRight: true,
      },
      {
        id: "p002-003.jpg.002",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
      {
        id: "p002-003.jpg.003",
        pageSpreadLeft: undefined,
        pageSpreadRight: true,
      },
    ])
  })

  it("should shift opening parity when an existing spread pair would otherwise be misaligned", async () => {
    const resourceNames = ["p001.jpg", "p002.jpg", "p003.jpg"]
    const archive = createArchive(resourceNames.map(createImageRecord))
    const manifest = createManifestFromResourceNames({
      readingDirection: "rtl",
      resourceNames,
    })
    const spreadManifest: Manifest = {
      ...manifest,
      spineItems: manifest.spineItems.map((spineItem) => {
        if (spineItem.id === "p002.jpg") {
          return {
            ...spineItem,
            pageSpreadLeft: undefined,
            pageSpreadRight: true,
          }
        }

        if (spineItem.id === "p003.jpg") {
          return {
            ...spineItem,
            pageSpreadLeft: true,
            pageSpreadRight: undefined,
          }
        }

        return spineItem
      }),
    }

    const result = await pageSpreadSplit({ archive, baseUrl: "" })(
      spreadManifest,
    )

    expect(result.spineItems).toMatchObject([
      {
        id: "p001.jpg",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
      {
        id: "p002.jpg",
        pageSpreadLeft: undefined,
        pageSpreadRight: true,
      },
      {
        id: "p003.jpg",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
    ])
  })

  it("should keep the opening page untouched when the first spread pair is naturally aligned", async () => {
    const resourceNames = ["p001.jpg", "p002.jpg", "p003-004.jpg"]
    const archive = createArchive(resourceNames.map(createImageRecord))
    const manifest = createManifestFromResourceNames({
      readingDirection: "rtl",
      resourceNames,
    })

    const result = await pageSpreadSplit({ archive, baseUrl: "" })(manifest)

    expect(result.spineItems).toMatchObject([
      { id: "p001.jpg" },
      { id: "p002.jpg" },
      {
        id: "p003-004.jpg.003",
        pageSpreadLeft: undefined,
        pageSpreadRight: true,
      },
      {
        id: "p003-004.jpg.004",
        pageSpreadLeft: true,
        pageSpreadRight: undefined,
      },
    ])
    expect(result.spineItems[0]?.pageSpreadLeft).toBeUndefined()
    expect(result.spineItems[0]?.pageSpreadRight).toBeUndefined()
    expect(result.spineItems[1]?.pageSpreadLeft).toBeUndefined()
    expect(result.spineItems[1]?.pageSpreadRight).toBeUndefined()
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
