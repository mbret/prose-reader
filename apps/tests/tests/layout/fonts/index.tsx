import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

/**
 * A reflowable book opened at the `cfi` of the URL, so a spec can change the
 * settings that decide how many pages a chapter takes.
 */
async function run() {
  const streamer = new Streamer({
    getArchive: async () => {
      const response = await fetch(
        "http://localhost:3333/epubs/accessible_epub_3.epub",
      )
      const archive = await loadAsync(await response.blob())

      return createArchiveFromJszip(archive)
    },
  })
  const manifestResponse = await streamer.fetchManifest()
  const manifest = await manifestResponse.json()
  const cfi = new URLSearchParams(window.location.search).get("cfi")

  const reader = createReader({
    manifest,
    target: cfi ? { type: "cfi", value: cfi } : undefined,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) =>
      from(streamer.fetchResource({ resourcePath: item.href })),
  })

  // biome-ignore lint/style/noNonNullAssertion: the page always has #app
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error read by the spec
  window.reader = reader
}

run()
