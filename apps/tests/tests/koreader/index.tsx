import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader, type ReadingPosition } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
import { generateXPointer, xPointerToCfi } from "@prose-reader/koreader"
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
  const cfi = query.get("cfi")
  const preload = query.get("preload")

  const reader = koreaderEnhancer(createReader)({
    manifest,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    ...(preload !== null && {
      numberOfAdjacentSpineItemToPreLoad: Number(preload),
    }),
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  // Every reading position from the start, converted to an xpointer as it
  // comes, the way a sync client converts what it pushes.
  const readingPositionsAsXPointers: {
    xpointer: string | undefined
    status: ReadingPosition["status"]
  }[] = []

  reader.navigation.readingPosition$.subscribe(({ cfi, status }) => {
    readingPositionsAsXPointers.push({
      xpointer: reader.koreader.cfiToXPointer(cfi),
      status,
    })
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for the spec
  window.reader = reader
  // @ts-expect-error export for the spec
  window.readingPositionsAsXPointers = readingPositionsAsXPointers
  // @ts-expect-error export for the spec
  window.koreader = { generateXPointer, xPointerToCfi }
}

run()
