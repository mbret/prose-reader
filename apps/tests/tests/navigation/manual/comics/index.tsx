import { createReader } from "@prose-reader/core"
import { Streamer, createArchiveFromJszip } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch("http://localhost:3333/epubs/sample.cbz")
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

  const reader = createReader({
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  const query = new URLSearchParams(window.location.search)
  const cfi = query.get("cfi") || undefined

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
    cfi,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
