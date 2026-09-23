import type { Directory } from "expo-file-system"
import { describe, expect, it, vi } from "vitest"
import { createArchiveFromExpoFileSystemNext } from "./createArchiveFromExpoFileSystemNext"
import { ReactNativeStreamer } from "./ReactNativeStreamer"

/**
 * expo-file-system is a native module, so it cannot run under vitest. These
 * fakes implement the part of its `Directory` and `File` surface that the
 * archive creator reads, over an in-memory tree; the archive reader and the
 * streamer on top of them are the real ones.
 */
const { FakeDirectory, FakeFile } = vi.hoisted(() => {
  const encoder = new TextEncoder()

  class FakeFile {
    constructor(
      readonly uri: string,
      private readonly content: string,
      readonly type: string | null = null,
    ) {}

    get name() {
      return this.uri.substring(this.uri.lastIndexOf("/") + 1)
    }

    info() {
      return { exists: true, size: encoder.encode(this.content).byteLength }
    }

    async arrayBuffer() {
      return encoder.encode(this.content).buffer
    }
  }

  class FakeDirectory {
    constructor(
      readonly uri: string,
      private readonly entries: (FakeDirectory | FakeFile)[],
    ) {}

    get name() {
      const path = this.uri.replace(/\/$/, "")

      return path.substring(path.lastIndexOf("/") + 1)
    }

    list() {
      return this.entries
    }
  }

  return { FakeDirectory, FakeFile }
})

vi.mock("expo-file-system", () => ({
  Directory: FakeDirectory,
  File: FakeFile,
}))

type FakeEntry = InstanceType<typeof FakeDirectory | typeof FakeFile>

/**
 * `uri` is the location on the device, the way expo-file-system spells it:
 * a `file://` url, with a trailing slash for directories.
 */
const directory = (uri: string, entries: FakeEntry[]) =>
  new FakeDirectory(uri, entries)

const file = (uri: string, content: string, type?: string) =>
  new FakeFile(uri, content, type)

const asExpoDirectory = (fake: InstanceType<typeof FakeDirectory>) =>
  // The creator only reads the members the fake implements; the rest of
  // expo-file-system's Directory needs the native module.
  fake as unknown as Directory

const bookRoot = "file:///data/cache/epubs/raw/book.epub"

const chapters: Record<string, string> = {
  chapter1: `<html xmlns="http://www.w3.org/1999/xhtml"><body><p>One</p></body></html>`,
  chapter2: `<html xmlns="http://www.w3.org/1999/xhtml"><body><p>Two</p></body></html>`,
}

const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`

const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:5a1e2b7c-0000-4000-8000-000000000000</dc:identifier>
    <dc:title>Unzipped book</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
    <itemref idref="chapter2"/>
  </spine>
</package>`

/**
 * An EPUB the way the demo leaves it after unzipping: a directory tree, with
 * the entries of each directory listed in no particular order.
 */
const unzippedBook = () =>
  asExpoDirectory(
    directory(`${bookRoot}/`, [
      directory(`${bookRoot}/OEBPS/`, [
        file(`${bookRoot}/OEBPS/chapter2.xhtml`, chapters.chapter2 ?? ""),
        file(`${bookRoot}/OEBPS/content.opf`, opf),
        file(`${bookRoot}/OEBPS/chapter1.xhtml`, chapters.chapter1 ?? ""),
      ]),
      file(`${bookRoot}/mimetype`, "application/epub+zip"),
      directory(`${bookRoot}/META-INF/`, [
        file(`${bookRoot}/META-INF/container.xml`, containerXml),
      ]),
    ]),
  )

describe("Given an unzipped EPUB directory served by ReactNativeStreamer", () => {
  const createStreamer = () =>
    new ReactNativeStreamer({
      cleanArchiveAfter: Infinity,
      getArchive: async () =>
        createArchiveFromExpoFileSystemNext(unzippedBook(), {
          orderByAlpha: true,
          name: "archive.zip",
        }),
    })

  it("builds the manifest from the package document", async () => {
    const streamer = createStreamer()

    const manifest = await (
      await streamer.fetchManifest({ key: "book" })
    ).json()

    expect(manifest.title).toBe("Unzipped book")
    expect(manifest.spineItems.map((item: { id: string }) => item.id)).toEqual([
      "chapter1",
      "chapter2",
    ])
  })

  it("serves every spine item from its file, as a string body", async () => {
    const streamer = createStreamer()
    const manifest = await (
      await streamer.fetchManifest({ key: "book" })
    ).json()

    for (const item of manifest.spineItems) {
      const resource = await streamer.fetchResourceAsData({
        key: "book",
        resourcePath: item.href,
      })

      expect(resource.data).toBe(chapters[item.id])
      expect(resource.headers["content-type"]).toContain(
        "application/xhtml+xml",
      )
    }
  })
})

describe("Given a directory of pages in chapter folders", () => {
  const comicRoot = "file:///data/cache/comics/raw/comic.cbz"
  const page = (path: string) => file(`${comicRoot}/${path}`, path)

  /** Listed out of order at every level, as a file system may return them. */
  const unzippedComic = () =>
    asExpoDirectory(
      directory(`${comicRoot}/`, [
        directory(`${comicRoot}/Chapter 2/`, [
          page("Chapter 2/002.jpg"),
          page("Chapter 2/001.jpg"),
        ]),
        directory(`${comicRoot}/Chapter 1/`, [
          page("Chapter 1/010.jpg"),
          page("Chapter 1/002.jpg"),
        ]),
      ]),
    )

  it("reads every page in path order with orderByAlpha, nested folders included", async () => {
    const streamer = new ReactNativeStreamer({
      cleanArchiveAfter: Infinity,
      getArchive: async () =>
        createArchiveFromExpoFileSystemNext(unzippedComic(), {
          orderByAlpha: true,
          name: "comic.cbz",
        }),
    })

    const manifest = await (
      await streamer.fetchManifest({ key: "comic" })
    ).json()

    expect(
      manifest.spineItems.map((item: { href: string }) =>
        decodeURI(item.href.substring(`${comicRoot}/`.length)),
      ),
    ).toEqual([
      "Chapter 1/002.jpg",
      "Chapter 1/010.jpg",
      "Chapter 2/001.jpg",
      "Chapter 2/002.jpg",
    ])
  })

  it("has one record per file and per directory, at any depth", async () => {
    const archive = await createArchiveFromExpoFileSystemNext(unzippedComic())

    expect(
      archive.records
        .map((record) => `${record.dir ? "directory" : "file"} ${record.uri}`)
        .sort(),
    ).toEqual(
      [
        "directory /data/cache/comics/raw/comic.cbz/Chapter 1/",
        "directory /data/cache/comics/raw/comic.cbz/Chapter 2/",
        "file /data/cache/comics/raw/comic.cbz/Chapter 1/002.jpg",
        "file /data/cache/comics/raw/comic.cbz/Chapter 1/010.jpg",
        "file /data/cache/comics/raw/comic.cbz/Chapter 2/001.jpg",
        "file /data/cache/comics/raw/comic.cbz/Chapter 2/002.jpg",
      ].sort(),
    )
  })
})
