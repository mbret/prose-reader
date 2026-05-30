import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { Streamer } from "@prose-reader/streamer"
import { createArchiveFromJszip } from "@prose-reader/streamer/archives/createArchiveFromJszip"
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

  const createReaderWithEnhancers = gesturesEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  // Hidden marker the spec asserts against. `data-count` is the total
  // number of boundary events; `data-last` is the most recent boundary
  // value ("start" | "end" | "").
  // biome-ignore lint/style/noNonNullAssertion: marker is in index.html
  const marker = document.getElementById("boundary-marker")!

  reader.navigation.outOfSpineBoundary$.subscribe(({ boundary }) => {
    const count = Number(marker.dataset.count ?? "0") + 1
    marker.dataset.count = String(count)
    marker.dataset.last = boundary
  })

  reader.load({
    // biome-ignore lint/style/noNonNullAssertion: TODO
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
