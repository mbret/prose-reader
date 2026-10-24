import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader, type ReadingPosition } from "@prose-reader/core"
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
  const manifestResponse = await streamer.fetchManifest()
  const manifest = await manifestResponse.json()

  const query = new URLSearchParams(window.location.search)
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

  // The pictures of each chapter as it reports loaded, from the reader's
  // creation on.
  const picturesWhenLoaded: {
    itemIndex: number
    images: {
      reference: string | null
      complete: boolean
      naturalWidth: number
    }[]
  }[] = []

  reader.spineItemsObserver.itemLoadStatusChange$.subscribe(
    ({ item, loadStatus }) => {
      if (loadStatus !== "loaded") return

      picturesWhenLoaded.push({
        itemIndex: item.index,
        images: Array.from(item.loadedDocument?.images ?? [], (image) => ({
          reference: image.getAttribute("src"),
          complete: image.complete,
          naturalWidth: image.naturalWidth,
        })),
      })
    },
  )

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the specs
  window.readingPositions = readingPositions
  // @ts-expect-error export for the specs
  window.picturesWhenLoaded = picturesWhenLoaded
}

run()
