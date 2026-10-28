import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { cbzEnhancer, streamerHooks } from "@prose-reader/cbz"
import { createReader } from "@prose-reader/core"
import { koreaderEnhancer } from "@prose-reader/enhancer-koreader"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

/**
 * A comic opened the way a library app opens one: the archive sorted by name,
 * its panorama split by the cbz streamer hooks, and the halves' cfis
 * rewritten by the cbz enhancer.
 */
async function createStreamer() {
  const streamer = new Streamer({
    hooks: streamerHooks,
    getArchive: async () => {
      const response = await fetch(
        "http://localhost:3333/epubs/koreader-pages.cbz",
      )
      const jszip = await loadAsync(await response.blob())

      return createArchiveFromJszip(jszip, {
        name: "koreader-pages.cbz",
        orderByAlpha: true,
      })
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

  const reader = koreaderEnhancer(cbzEnhancer(createReader))({
    manifest,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ key: `_`, resourcePath: item.href }))
    },
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for the spec
  window.reader = reader
}

run()
