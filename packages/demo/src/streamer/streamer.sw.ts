import {
  createArchiveFromText,
  createArchiveFromJszip,
  ServiceWorkerStreamer,
} from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import { STREAMER_URL_PREFIX } from "../constants.shared"
import { getBlobFromKey, getStreamerBaseUrl } from "./utils.shared"

export const swStreamer = new ServiceWorkerStreamer({
  cleanArchiveAfter: 5 * 60 * 1000,
  getUriInfo: (event) => {
    const url = new URL(event.request.url)

    if (!url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {
      return undefined
    }

    return { baseUrl: getStreamerBaseUrl(url) }
  },
  getArchive: async (key) => {
    const { blob, url } = await getBlobFromKey(key)

    if (url.endsWith(`.txt`)) {
      return await createArchiveFromText(blob)
    } else {
      const name = blob.name
      const jszip = await loadAsync(blob)

      return await createArchiveFromJszip(jszip, { orderByAlpha: true, name })
    }
  },
})
