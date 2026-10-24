import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader, type ReadingPosition } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

/**
 * Gives every image of the book's pages `loading="lazy"`, and a top margin that
 * keeps it far beyond any engine's lazy loading distance while its page loads.
 */
const makeImagesLazy = async (
  epubJszip: Awaited<ReturnType<typeof loadAsync>>,
) => {
  for (const page of epubJszip.file(/\.xhtml$/)) {
    const content = await page.async("string")

    epubJszip.file(
      page.name,
      content.replace(
        /<img /g,
        '<img loading="lazy" style="margin-top: 10000px" ',
      ),
    )
  }
}

async function createStreamer({ lazyImages }: { lazyImages: boolean }) {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch(
        "http://localhost:3333/epubs/accessible_epub_3.epub",
      )
      const epubBlob = await epubResponse.blob()
      const epubJszip = await loadAsync(epubBlob)

      if (lazyImages) await makeImagesLazy(epubJszip)

      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
  })

  return streamer
}

async function run() {
  const query = new URLSearchParams(window.location.search)
  const streamer = await createStreamer({
    lazyImages: query.has("lazyImages"),
  })
  const manifestResponse = await streamer.fetchManifest()
  const manifest = await manifestResponse.json()

  const cfi = query.get("cfi")
  const preload = query.get("preload")
  const pageHorizontalMargin = query.get("pageHorizontalMargin")

  const reader = createReader({
    manifest,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    ...(pageHorizontalMargin !== null && {
      pageHorizontalMargin: Number(pageHorizontalMargin),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ resourcePath: item.href }))
    },
  })

  // Every reading position from the reader's creation on, earlier than a spec
  // can subscribe.
  const readingPositions: ReadingPosition[] = []

  reader.navigation.readingPosition$.subscribe((readingPosition) => {
    readingPositions.push(readingPosition)
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.readingPositions = readingPositions
}

run()
