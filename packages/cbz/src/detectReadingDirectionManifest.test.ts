import type { Manifest } from "@prose-reader/shared"
import type { Archive } from "@prose-reader/streamer"
import { describe, expect, it } from "vitest"
import { detectReadingDirectionManifest } from "./detectReadingDirectionManifest"

const fakeContent = {
  blob: () => Promise.resolve(new Blob([])),
  string: () => Promise.resolve(""),
}

const createArchive = ({
  encodingFormat,
  filename,
  records = [],
}: {
  encodingFormat?: string
  filename: string
  records?: Archive["records"]
}): Archive => ({
  close: () => Promise.resolve(),
  encodingFormat,
  filename,
  records,
})

const createImageRecord = (basename: string): Archive["records"][number] => ({
  ...fakeContent,
  basename,
  dir: false,
  encodingFormat: "image/jpeg",
  size: 1,
  uri: basename,
})

const createManifest = (
  readingDirection: Manifest["readingDirection"] = undefined,
): Manifest => ({
  filename: "",
  items: [],
  readingDirection,
  renditionLayout: "pre-paginated",
  renditionSpread: undefined,
  spineItems: [],
  title: "",
})

const runHook = async (archive: Archive, manifest: Manifest) =>
  detectReadingDirectionManifest({ archive, baseUrl: "" })(manifest)

describe("detectReadingDirectionManifest", () => {
  it("defaults to rtl for a cbz with no upstream-detected direction", async () => {
    const archive = createArchive({
      filename: "manga.cbz",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest(undefined)

    await expect(runHook(archive, manifest)).resolves.toMatchObject({
      readingDirection: "rtl",
    })
  })

  it("detects cbz from archive-level mime type when extension is absent", async () => {
    const archive = createArchive({
      encodingFormat: "application/vnd.comicbook+zip",
      filename: "untitled",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest(undefined)

    await expect(runHook(archive, manifest)).resolves.toMatchObject({
      readingDirection: "rtl",
    })
  })

  it("also recognizes the legacy application/x-cbz mime type", async () => {
    const archive = createArchive({
      encodingFormat: "application/x-cbz",
      filename: "untitled",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest(undefined)

    await expect(runHook(archive, manifest)).resolves.toMatchObject({
      readingDirection: "rtl",
    })
  })

  it("preserves an upstream-detected ltr direction (e.g. ComicInfo Manga=No)", async () => {
    const archive = createArchive({
      filename: "manga.cbz",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest("ltr")

    await expect(runHook(archive, manifest)).resolves.toBe(manifest)
  })

  it("preserves an upstream-detected rtl direction", async () => {
    const archive = createArchive({
      filename: "manga.cbz",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest("rtl")

    await expect(runHook(archive, manifest)).resolves.toBe(manifest)
  })

  it("returns the manifest unchanged for non-cbz archives", async () => {
    const archive = createArchive({
      filename: "book.epub",
      records: [createImageRecord("001.jpg")],
    })
    const manifest = createManifest(undefined)

    await expect(runHook(archive, manifest)).resolves.toBe(manifest)
  })
})
