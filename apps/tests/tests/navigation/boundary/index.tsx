import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
import { createArchiveFromJszip, Streamer } from "@prose-reader/streamer"
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

  /**
   * Tests assert against this hidden marker rather than any fragile
   * spy — the navigation primitive `boundaryReached$` toggles a couple
   * of `data-*` attributes that Playwright can read deterministically.
   *
   * `data-count`: total number of boundary events fired so far.
   * `data-last` : the last boundary value that fired ("start" | "end" | "").
   */
  // biome-ignore lint/style/noNonNullAssertion: marker is in index.html
  const marker = document.getElementById("boundary-marker")!

  reader.navigation.boundaryReached$.subscribe(({ boundary }) => {
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
