import { createReader } from "@prose-reader/core"
import {
  Streamer,
  createArchiveFromText,
  generateManifestFromArchive,
} from "@prose-reader/streamer"
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
    pageTurnAnimation: "none",
    getResource: (item) =>
      from(streamer.fetchResource({ key: `_`, resourcePath: item.href })),
    layoutLayerTransition: false,
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
