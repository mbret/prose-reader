import type { Manifest } from "@prose-reader/shared"
import { describe, expect, it } from "vitest"
import type { Archive } from "../archives/types"
import {
  isPageSpreadSplitSupportedArchiveRecord,
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
      id: "0.p002-003.jpg",
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
      id: "0.p002-003.txt",
      mediaType: "image/jpeg",
    })

    await expect(
      pageSpreadSplit({ archive, baseUrl: "" })(manifest),
    ).resolves.toBe(manifest)
  })
})
