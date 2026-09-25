import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader } from "@prose-reader/core"
import { gesturesEnhancer } from "@prose-reader/enhancer-gestures"
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

  const createReaderWithEnhancers = gesturesEnhancer(createReader)

  const reader = createReaderWithEnhancers({
    manifest,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  // Every tap the enhancer reports, handled (it turned a page) or not (left
  // to the app, which toggles its menus on one), for the spec to read back.
  const taps: { x: number; button: number; handled: boolean }[] = []

  reader.gestures.gestures$.subscribe((gesture) => {
    if (gesture.type !== "tap") return

    taps.push({
      x: Math.round(gesture.gestureEvent.center.x),
      button: gesture.gestureEvent.event.button,
      handled: gesture.handled,
    })
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
  // @ts-expect-error export for the spec
  window.taps = taps
}

run()
