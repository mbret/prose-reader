import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch(
        "http://localhost:3333/epubs/accessible_epub_3.epub",
      )
      const epubBlob = await epubResponse.blob()
      const epubJszip = await loadAsync(epubBlob)
      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
  })

  return streamer
}

async function run() {
  const streamer = await createStreamer()
  const manifestResponse = await streamer.fetchManifest({
    key: `_`,
  })
  const manifest = await manifestResponse.json()

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi") || undefined
  const preload = query.get("preload")

  const reader = createReader({
    manifest,
    cfi,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  // Every reading position from the reader's creation on, earlier than a spec
  // can subscribe.
  const readingPositions: string[] = []

  reader.navigation.readingPosition$.subscribe((cfi) => {
    readingPositions.push(cfi)
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.readingPositions = readingPositions
}

run()
