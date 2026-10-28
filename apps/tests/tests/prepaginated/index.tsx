import { createArchiveFromJszip } from "@prose-reader/archive-reader/archives/createArchiveFromJszip"
import { createReader } from "@prose-reader/core"
import { Streamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { from } from "rxjs"

window.__PROSE_READER_DEBUG = true

const removeStylesheetLinks = async (
  epubJszip: Awaited<ReturnType<typeof loadAsync>>,
) => {
  for (const page of epubJszip.file(/\.xhtml$/)) {
    const content = await page.async("string")

    epubJszip.file(
      page.name,
      content.replace(/<link [^>]*rel="stylesheet"[^>]*\/>/g, ""),
    )
  }
}

async function createStreamer() {
  const streamer = new Streamer({
    getArchive: async () => {
      const epubResponse = await fetch(
        "http://localhost:3333/epubs/sous-le-vent.epub",
      )
      const epubBlob = await epubResponse.blob()
      const epubJszip = await loadAsync(epubBlob)

      if (
        new URLSearchParams(window.location.search).has("withoutStylesheets")
      ) {
        await removeStylesheetLinks(epubJszip)
      }

      const archive = await createArchiveFromJszip(epubJszip)

      return archive
    },
    cleanArchiveAfter: 5 * 60 * 1000,
  })

  return streamer
}

async function run() {
  const streamer = await createStreamer()

  const manifestResponse = await streamer.fetchManifest()

  const manifest = await manifestResponse.json()

  console.log(manifest)

  const reader = createReader({
    manifest,
    numberOfAdjacentSpineItemToPreLoad: 0,
    pageTurnAnimation: "none",
    layoutLayerTransition: false,
    getResource: (item) => {
      return from(streamer.fetchResource({ resourcePath: item.href }))
    },
  })

  /**
   * Finally we can mount the reader.
   */
  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error
  window.reader = reader
}

run()
