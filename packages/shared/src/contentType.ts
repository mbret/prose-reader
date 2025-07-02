import { getUrlExtension } from "./url"

export const detectMimeTypeFromName = (name: string) => {
  const extension = getUrlExtension(name)

  switch (extension) {
    case `png`:
      return `image/png`
    case `jpg`:
      return `image/jpg`
    case `jpeg`:
      return `image/jpeg`
    case `txt`:
      return `text/plain`
    case `webp`:
      return `image/webp`
    case `xhtml`:
      return `application/xhtml+xml`
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

export const parseContentType = (str: string) => {
  if (!str.length) return undefined

  const cut = str.indexOf(`;`)

  return cut ? str.substring(0, str.indexOf(`;`)) : str
}
