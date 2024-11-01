import "./style.css"
import { createReader } from "@prose-reader/core"
import { ResourceHandler } from "@prose-reader/core"
import { createArchiveFromText, Streamer } from "@prose-reader/streamer"

async function run() {
  const archive = await createArchiveFromText(`test`)
  const streamer = new Streamer({
    getArchive: async () => archive,
    cleanArchiveAfter: 5 * 60 * 1000,
  })
  const manifest = await (await streamer.fetchManifest({ key: `_` })).json()

  const reader = createReader({
    getResourcesHandler: (item) =>
      class extends ResourceHandler {
        async getResource() {
          return streamer.fetchResource({
            key: `_`,
            resourcePath: item.href,
          })
        }
      },
  })

  reader.load({
    containerElement: document.getElementById(`app`)!,
    manifest,
  })
}

run()
