import { streamerHooks } from "@prose-reader/cbz"
import {
  createArchiveFromText,
  ServiceWorkerStreamer,
} from "@prose-reader/streamer"
import { createArchiveFromJszip } from "@prose-reader/streamer/archives/createArchiveFromJszip"
import { loadAsync } from "jszip"
import { STREAMER_URL_PREFIX } from "../constants.shared"
import { getBlobFromKey, getStreamerBaseUrl } from "./utils.shared"

export const swStreamer = new ServiceWorkerStreamer({
  cleanArchiveAfter: 5 * 60 * 1000,
  hooks: {
    manifest: {
      content: streamerHooks.manifest.content,
      spine: streamerHooks.manifest.spine,
    },
    resource: streamerHooks.resource,
  },
  getUriInfo: (event) => {
    const url = new URL(event.request.url)

    if (!url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {
      return undefined
    }

    return { baseUrl: getStreamerBaseUrl(url) }
  },
  getArchive: async (key) => {
    const { blob, url, filename } = await getBlobFromKey(key)
    const encodingFormat = blob.type.length > 0 ? blob.type : undefined

    if (url.endsWith(`.txt`)) {
      return await createArchiveFromText(blob, {
        mimeType: encodingFormat ?? "text/plain",
      })
    }
    const name = blob instanceof File ? blob.name : filename

    const jszip = await loadAsync(blob)

    return await createArchiveFromJszip(jszip, {
      orderByAlpha: true,
      name,
      encodingFormat,
    })
  },
})
