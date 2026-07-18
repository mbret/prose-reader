import { createArchiveFromText } from "@prose-reader/archive-reader"
import { createReader } from "@prose-reader/core"
import { generateManifestFromArchive, Streamer } from "@prose-reader/streamer"
import { from } from "rxjs"

async function run() {
  const archive = await createArchiveFromText(`test`)
  const streamer = new Streamer({
    getArchive: async () => archive,
    cleanArchiveAfter: 5 * 60 * 1000,
  })

  const manifest = await generateManifestFromArchive(archive)

  const createReaderWithEnhancers = createReader

  const reader = createReaderWithEnhancers({
    manifest,
    pageTurnAnimation: "none",
    getResource: (item) =>
      from(streamer.fetchResource({ key: `_`, resourcePath: item.href })),
    layoutLayerTransition: false,
  })

  // biome-ignore lint/style/noNonNullAssertion: TODO
  reader.mount(document.getElementById(`app`)!)

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
