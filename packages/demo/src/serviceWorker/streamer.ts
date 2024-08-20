import { createArchiveFromText, createArchiveFromJszip, ServiceWorkerStreamer } from "@prose-reader/streamer"
import { loadAsync } from "jszip"
import localforage from "localforage"
import { STREAMER_URL_PREFIX } from "../constants.shared"

export const streamer = new ServiceWorkerStreamer({
  cleanAfter: 5 * 60 * 1000,
  getStreamerUri: (event) => {
    const url = new URL(event.request.url)
    const pathname = url.pathname

    if (!url.pathname.startsWith(`/${STREAMER_URL_PREFIX}`)) {
      return undefined
    }

    return pathname.substring(`/${STREAMER_URL_PREFIX}/`.length)
  },
  getArchive: async (key) => {
    const demoEpubUrl = atob(key)
    const epubFilenameFromUrl = demoEpubUrl.substring(demoEpubUrl.lastIndexOf("/") + 1)

    const responseOrFile = demoEpubUrl.startsWith(`file://`)
      ? await localforage.getItem<File>(epubFilenameFromUrl)
      : await fetch(demoEpubUrl)

    if (!responseOrFile) {
      throw new Error(`Unable to retrieve ${demoEpubUrl}`)
    }

    if (demoEpubUrl.endsWith(`.txt`)) {
      const content = await responseOrFile.text()
      return await createArchiveFromText(content)
    } else {
      const epubData = `blob` in responseOrFile ? await responseOrFile.blob() : responseOrFile
      const name = epubData.name
      const jszip = await loadAsync(epubData)

      return await createArchiveFromJszip(jszip, { orderByAlpha: true, name })
    }
  }
})
