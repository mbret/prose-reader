import { createReader } from "@prose-reader/core"
import { createArchiveFromJszip, Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

window.__PROSE_READER_DEBUG = true

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch(
        "http://localhost:3333/epubs/sous-le-vent.epub",
      )
      const epubBlob = await epubResponse.blob()
      const epubJszip = await loadAsync(epubBlob)
      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
    cleanArchiveAfter: 5 * 60 * 1000,
  })

  return streamer
}

async function run() {
  const streamer = await createStreamer()

  const manifestResponse = await streamer.fetchManifest({
    key: `_`,
  })

  const manifest = await manifestResponse.json()

  console.log(manifest)

  const reader = createReader({
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  /**
   * Finally we can load the reader with our manifest.
   */
  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-ignore
  window.reader = reader

  reader.layout$.subscribe(() => {
    // @ts-ignore
    window.layoutNumber = (window.layoutNumber ?? 0) + 1
  })
}

run()
