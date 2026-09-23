import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

/**
 * A book of one image per page, created with the default left to right page
 * turn, so a spec can change the settings that decide where the pages go.
 */
async function run() {
  const streamer = new Streamer({
    getArchive: async () => {
      const response = await fetch("http://localhost:3333/epubs/sample.cbz")
      const archive = await loadAsync(await response.blob())

      return createArchiveFromJszip(archive)
    },
  })
  const manifestResponse = await streamer.fetchManifest({ key: `_` })
  const manifest = await manifestResponse.json()

  const reader = createReader({
    manifest,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) =>
      from(streamer.fetchResource({ key: `_`, resourcePath: item.href })),
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
}

run()
