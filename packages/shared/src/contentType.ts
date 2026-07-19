import { getUrlExtension } from "./url"

export const detectMimeTypeFromName = (name: string) => {
  // extensions are case-insensitive (`COVER.JPG` is a jpeg)
  const extension = getUrlExtension(name).toLowerCase()

  switch (extension) {
    case `png`:
      return `image/png`
    case `jpg`:
      return `image/jpg`
    case `jpeg`:
      return `image/jpeg`
    case `gif`:
      return `image/gif`
    case `webp`:
      return `image/webp`
    case `avif`:
      return `image/avif`
    case `bmp`:
      return `image/bmp`
    case `tif`:
    case `tiff`:
      return `image/tiff`
    case `svg`:
      return `image/svg+xml`
    case `txt`:
      return `text/plain`
    case `xhtml`:
      return `application/xhtml+xml`
    case `mp3`:
      return `audio/mpeg`
    case `m4a`:
    case `m4b`:
      return `audio/mp4`
    case `aac`:
      return `audio/aac`
    case `ogg`:
    case `oga`:
      return `audio/ogg`
    case `wav`:
      return `audio/wav`
    case `flac`:
      return `audio/flac`
    case `opus`:
      return `audio/opus`
  }

  return undefined
}

export const isXmlBasedMimeType = ({
  mimeType,
  uri,
}: {
  uri?: string
  mimeType?: string
}) => {
  const _mimeType = mimeType ?? detectMimeTypeFromName(uri ?? "")

  return _mimeType?.startsWith(`application/xhtml+xml`)
}

/**
 * Discrete media MIME types represent a single self-contained unit
 * (an image, an audio track, a video clip) as opposed to document
 * content that may need reflowable layout.
 */
export const isMediaContentMimeType = (mimeType: string) =>
  mimeType.startsWith("image/") ||
  mimeType.startsWith("audio/") ||
  mimeType.startsWith("video/")

export const parseContentType = (str: string) => {
  if (!str.length) return undefined

  const cut = str.indexOf(`;`)

  return cut >= 0 ? str.substring(0, cut) : str
}
