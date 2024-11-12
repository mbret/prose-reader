import { createReader } from "@prose-reader/core"
import { createArchiveFromText, generateManifestFromArchive, Streamer } from "@prose-reader/streamer"
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
    getResource: (item) => from(streamer.fetchResource({ key: `_`, resourcePath: item.href })),
  })

  reader.load({
    containerElement: document.getElementById(`app`)!,
    manifest,
  })

  // @ts-expect-error export for debug
  window.reader = reader
}

run()
