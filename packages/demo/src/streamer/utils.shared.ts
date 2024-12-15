import localforage from "localforage"
import { STREAMER_URL_PREFIX } from "../constants.shared"

export const getStreamerBaseUrl = (url: URL) => {
  return `${url.origin}/${STREAMER_URL_PREFIX}`
}

export const getFileKeyFromUrl = (url: string) => {
  const { pathname } = new URL(url)
  const urlWithoutPrefix = pathname.substring(`/${STREAMER_URL_PREFIX}/`.length)
  const nextSlashIndex = urlWithoutPrefix.indexOf("/")

  if (nextSlashIndex !== -1) {
    return urlWithoutPrefix.substring(0, urlWithoutPrefix.indexOf("/"))
  }

  return urlWithoutPrefix
}

export const getBlobFromKey = async (key: string) => {
  const demoEpubUrl = decodeURIComponent(atob(key))
  const epubFilenameFromUrl = demoEpubUrl.substring(demoEpubUrl.lastIndexOf("/") + 1)

  const responseOrFile = demoEpubUrl.startsWith(`file://`)
    ? await localforage.getItem<File>(epubFilenameFromUrl)
    : await fetch(demoEpubUrl)

  if (!responseOrFile) {
    throw new Error(`Unable to retrieve ${demoEpubUrl}`)
  }

  if (responseOrFile instanceof Response) {
    const blob = await responseOrFile.blob()

    return { blob, url: demoEpubUrl }
  }

  return { blob: responseOrFile, url: demoEpubUrl }
}
