// @vitest-environment happy-dom
import {
  type Archive,
  blobFileAccessors,
  createArchive,
} from "@prose-reader/archive-reader"
import { cbzEnhancer, streamerHooks } from "@prose-reader/cbz"
import {
  createReader,
  type Manifest,
  type NavigationTarget,
  type UserNavigationEntry,
} from "@prose-reader/core"
import { generateManifestFromArchive } from "@prose-reader/streamer"
import { afterEach, describe, expect, it } from "vitest"
import { koreaderEnhancer } from "./koreaderEnhancer"

/**
 * Drives the enhancer on a real reader, unmounted: converting a cfi needs the
 * book's spine and the reader's cfi hooks, no layout. A navigation is held at
 * the reader's own `navigate`, where the enhancer hands it the target it
 * resolved; going there is the browser suite's to check.
 */

const readers: { destroy: () => void }[] = []

afterEach(() => {
  for (const reader of readers.splice(0)) reader.destroy()
})

/** The core reader, with the targets the enhancer asks it for recorded. */
const createRecordingReader = (options: Parameters<typeof createReader>[0]) => {
  const reader = createReader(options)
  const navigatedTo: NavigationTarget[] = []

  return {
    reader: {
      ...reader,
      navigation: {
        ...reader.navigation,
        navigate: (to: UserNavigationEntry) => {
          navigatedTo.push(to.target)
        },
      },
    },
    navigatedTo,
  }
}

const createKoreaderReader = (manifest: Manifest) => {
  let navigatedTo: NavigationTarget[] = []
  const reader = koreaderEnhancer((options: { manifest: Manifest }) => {
    const recording = createRecordingReader(options)

    navigatedTo = recording.navigatedTo

    return recording.reader
  })({ manifest })

  readers.push(reader)

  return { reader, navigatedTo }
}

const fakeContent = blobFileAccessors(() => Promise.resolve(new Blob([])))

const archiveOf = (
  filename: string,
  entryNames: string[],
  encodingFormat?: string,
): Archive =>
  createArchive({
    filename,
    encodingFormat,
    records: entryNames.map((uri) => ({
      ...fakeContent,
      dir: false,
      basename: uri.split("/").pop() ?? uri,
      uri,
      size: 1,
    })),
    close: () => Promise.resolve(),
  })

/**
 * A comic, read in archive order, with two panoramas the cbz streamer hooks
 * split in two. Its images are named in order, so prose's reading order is
 * the order KOReader numbers them in, which the enhancer assumes (#535).
 */
const COMIC_ENTRIES = [
  "p01.jpg",
  "p02-03.jpg",
  "p04.jpg",
  "p05-06.jpg",
  "p07.jpg",
]

/** KOReader's page of each entry: its place among the entries. */
const KOREADER_PAGE_OF_ENTRY: Record<string, string> = {
  "p01.jpg": "1",
  "p02-03.jpg": "2",
  "p04.jpg": "3",
  "p05-06.jpg": "4",
  "p07.jpg": "5",
}

const generateComicManifest = () =>
  generateManifestFromArchive(archiveOf("comic.cbz", COMIC_ENTRIES), {
    hooks: streamerHooks.manifest,
  })

/** Every spine item's cfi, paired with the entry it shows. */
const getSpineItemCfis = (reader: {
  context: { manifest: Manifest }
  cfi: { generateRootCfi: (item: Manifest["spineItems"][number]) => string }
}) =>
  reader.context.manifest.spineItems.map((item) => ({
    containerUri: item.containerUri,
    cfi: reader.cfi.generateRootCfi(item),
  }))

describe("Given a comic archive", () => {
  it("the progress of each spine item is the page of the entry it shows, both halves of a panorama sharing one", async () => {
    const manifest = await generateComicManifest()
    const { reader } = createKoreaderReader(manifest)

    // Each panorama is two spine items.
    expect(manifest.spineItems).toHaveLength(COMIC_ENTRIES.length + 2)

    for (const { containerUri, cfi } of getSpineItemCfis(reader)) {
      expect(
        reader.koreader.cfiToProgress(cfi),
        `progress of ${containerUri}`,
      ).toBe(KOREADER_PAGE_OF_ENTRY[containerUri])
    }
  })

  it("both halves of a split panorama are its page, with the cbz enhancer rewriting their cfis", async () => {
    // The cbz enhancer writes the index of the panorama among the entries
    // into the cfi of a half, which the panorama split before it shifts away
    // from the half's own index.
    const manifest = await generateComicManifest()
    const reader = koreaderEnhancer(cbzEnhancer(createReader))({ manifest })

    readers.push(reader)

    const halves = getSpineItemCfis(reader).filter(
      ({ containerUri }) => containerUri === "p05-06.jpg",
    )

    expect(halves).toHaveLength(2)

    for (const { cfi } of halves) {
      expect(reader.koreader.cfiToProgress(cfi)).toBe("4")
    }
  })

  it("going to a page goes to the first spine item showing its entry", async () => {
    const manifest = await generateComicManifest()
    const { reader, navigatedTo } = createKoreaderReader(manifest)
    const indexOf = (containerUri: string) =>
      manifest.spineItems.findIndex(
        (item) => item.containerUri === containerUri,
      )

    reader.navigation.goToKoreaderProgress("1")
    reader.navigation.goToKoreaderProgress("4")
    reader.navigation.goToKoreaderProgress(" 5 ")

    expect(navigatedTo).toEqual([
      { type: "spineItem", value: indexOf("p01.jpg") },
      { type: "spineItem", value: indexOf("p05-06.jpg") },
      { type: "spineItem", value: indexOf("p07.jpg") },
    ])
  })

  it("a page the book does not have, or an xpointer, goes nowhere", async () => {
    const { reader, navigatedTo } = createKoreaderReader(
      await generateComicManifest(),
    )

    reader.navigation.goToKoreaderProgress("0")
    reader.navigation.goToKoreaderProgress("6")
    reader.navigation.goToKoreaderProgress("2.5")
    reader.navigation.goToKoreaderProgress("/body/DocFragment[2]/body")

    expect(navigatedTo).toEqual([])
  })
})

describe("Given a ZIP of images", () => {
  const generateZipManifest = () =>
    generateManifestFromArchive(archiveOf("book.zip", ["p01.jpg", "p02.jpg"]))

  it("it has no progress, and goes to none, as its media type does not tell the engine KOReader opens it with", async () => {
    // KOReader opens a ZIP with the engine its first file calls for
    const { reader, navigatedTo } = createKoreaderReader(
      await generateZipManifest(),
    )

    for (const { cfi } of getSpineItemCfis(reader)) {
      expect(reader.koreader.cfiToProgress(cfi)).toBeUndefined()
    }

    reader.navigation.goToKoreaderProgress("1")

    expect(navigatedTo).toEqual([])
  })

  it("its pages are its images', once the app gives it a comic's media type", async () => {
    const { reader, navigatedTo } = createKoreaderReader({
      ...(await generateZipManifest()),
      mediaType: "application/vnd.comicbook+zip",
    })

    expect(
      getSpineItemCfis(reader).map(({ cfi }) =>
        reader.koreader.cfiToProgress(cfi),
      ),
    ).toEqual(["1", "2"])

    reader.navigation.goToKoreaderProgress("2")

    expect(navigatedTo).toEqual([{ type: "spineItem", value: 1 }])
  })
})

describe("Given a PDF", () => {
  /** One spine item per page, as `createArchiveFromPdf` writes it. */
  const manifest: Manifest = {
    filename: "book.pdf",
    mediaType: "application/pdf",
    title: "",
    readingDirection: "ltr",
    renditionLayout: "pre-paginated",
    renditionSpread: undefined,
    items: [],
    spineItems: [0, 1, 2].map((index) => ({
      id: `page-${index}`,
      index,
      href: `file://${index}.pdf`,
      containerUri: `${index}.pdf`,
    })),
  }

  it("the progress of a spine item is its page", () => {
    const { reader } = createKoreaderReader(manifest)

    expect(
      getSpineItemCfis(reader).map(({ cfi }) =>
        reader.koreader.cfiToProgress(cfi),
      ),
    ).toEqual(["1", "2", "3"])
  })

  it("going to a page goes to its spine item, and to nothing past the last", () => {
    const { reader, navigatedTo } = createKoreaderReader(manifest)

    reader.navigation.goToKoreaderProgress("3")
    reader.navigation.goToKoreaderProgress("4")

    expect(navigatedTo).toEqual([{ type: "spineItem", value: 2 }])
  })
})

describe("Given an EPUB", () => {
  const generateEpubManifest = () =>
    generateManifestFromArchive(
      archiveOf("book.epub", ["META-INF/container.xml", "ch1.xhtml"]),
    )

  it("the progress of a chapter is its xpointer, at once", async () => {
    const { reader } = createKoreaderReader(await generateEpubManifest())
    const [chapter] = getSpineItemCfis(reader)

    expect(reader.koreader.cfiToProgress(chapter?.cfi ?? "")).toBe(
      "/body/DocFragment[1]/body",
    )
  })

  it("going to an xpointer looks for its place in its chapter, and a page number goes nowhere", async () => {
    const { reader, navigatedTo } = createKoreaderReader(
      await generateEpubManifest(),
    )

    reader.navigation.goToKoreaderProgress("/body/DocFragment[1]/body/p[2]")
    reader.navigation.goToKoreaderProgress("1")

    expect(navigatedTo).toMatchObject([
      { type: "selector", value: { spineItem: 0 } },
    ])
  })
})

describe("Given a book prose has no KOReader progress for", () => {
  it.each([
    ["a text file", "text/plain"],
    ["data of an unknown type", "application/octet-stream"],
  ])("%s has no progress, and goes to none", (_, mediaType) => {
    const { reader, navigatedTo } = createKoreaderReader({
      filename: "",
      mediaType,
      title: "",
      readingDirection: "ltr",
      renditionLayout: "reflowable",
      renditionSpread: undefined,
      items: [],
      spineItems: [
        {
          id: "p01",
          index: 0,
          href: "file://p01.txt",
          containerUri: "p01.txt",
        },
      ],
    })
    const [item] = getSpineItemCfis(reader)

    expect(reader.koreader.cfiToProgress(item?.cfi ?? "")).toBeUndefined()

    reader.navigation.goToKoreaderProgress("1")
    reader.navigation.goToKoreaderProgress("/body/DocFragment[1]/body")

    expect(navigatedTo).toEqual([])
  })
})
