import {
  detectMimeTypeFromName,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"
import type { Archive } from "../archives/types"
import { isArchiveEpub } from "../epubs/isArchiveEpub"
import { createManifestResourceHref } from "../generators/manifest/createManifestResourceHref"
import { detectPageSpreadFromBasename } from "./detectPageSpreadFromBasename"

export {
  type DetectedPageSpread,
  detectPageSpreadFromBasename,
} from "./detectPageSpreadFromBasename"

export type ImageWrapperResource = {
  originalUri: string
}

export const IMAGE_WRAPPER_ID_PREFIX = `pr-img-`
export const IMAGE_WRAPPER_RESOURCE_PREFIX = `__prose-reader__/image-wrapper`
export const IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE = `application/xhtml+xml`

const supportedImageMediaTypes = new Set([
  `image/jpg`,
  `image/jpeg`,
  `image/png`,
  `image/webp`,
])

export const isPageSpreadSplitSupportedImage = (
  mimeType: string | undefined,
) => {
  if (mimeType === undefined) return false

  return supportedImageMediaTypes.has(mimeType)
}

type SpineItem = Manifest["spineItems"][number]
type ManifestItem = Manifest["items"][number]
type ArchiveRecord = Archive["records"][number]
type ArchiveFileRecord = Extract<ArchiveRecord, { dir: false }>

const base64UrlAlphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

const base64UrlValueByChar = new Map(
  [...base64UrlAlphabet].map((char, value) => [char, value]),
)

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value)
  let encoded = ``

  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i]
    if (first === undefined) continue

    const second = bytes[i + 1]
    const third = bytes[i + 2]

    encoded += base64UrlAlphabet[first >> 2]

    if (second === undefined) {
      encoded += base64UrlAlphabet[(first & 3) << 4]
      break
    }

    encoded += base64UrlAlphabet[((first & 3) << 4) | (second >> 4)]

    if (third === undefined) {
      encoded += base64UrlAlphabet[(second & 15) << 2]
      break
    }

    encoded += base64UrlAlphabet[((second & 15) << 2) | (third >> 6)]
    encoded += base64UrlAlphabet[third & 63]
  }

  return encoded
}

const decodeBase64Url = (value: string): string | undefined => {
  const bytes: number[] = []
  let buffer = 0
  let bits = 0

  for (const char of value) {
    const charValue = base64UrlValueByChar.get(char)

    if (charValue === undefined) return undefined

    buffer = (buffer << 6) | charValue
    bits += 6

    if (bits >= 8) {
      bits -= 8
      bytes.push((buffer >> bits) & 255)
    }
  }

  try {
    return new TextDecoder().decode(new Uint8Array(bytes))
  } catch {
    return undefined
  }
}

export const buildImageWrapperIdFromOriginalUri = (originalUri: string) =>
  `${IMAGE_WRAPPER_ID_PREFIX}${encodeBase64Url(originalUri)}`

export const decodeImageWrapperIdToOriginalUri = (
  wrapperId: string,
): string | undefined => {
  if (!wrapperId.startsWith(IMAGE_WRAPPER_ID_PREFIX)) return undefined

  return decodeBase64Url(wrapperId.slice(IMAGE_WRAPPER_ID_PREFIX.length))
}

export const buildImageWrapperResourcePath = ({
  wrapperId,
}: {
  wrapperId: string
}) => `${IMAGE_WRAPPER_RESOURCE_PREFIX}/${wrapperId}.xhtml`

export const buildImageWrapperResourcePathFromOriginalUri = ({
  originalUri,
}: {
  originalUri: string
}) =>
  buildImageWrapperResourcePath({
    wrapperId: buildImageWrapperIdFromOriginalUri(originalUri),
  })

const createImageWrapperSpineItem = ({
  baseUrl,
  originalSpineItem,
  originalUri,
}: {
  baseUrl: string
  originalSpineItem: SpineItem
  originalUri: string
}): SpineItem => {
  const wrapperId = buildImageWrapperIdFromOriginalUri(originalUri)
  const resourcePath = buildImageWrapperResourcePath({
    wrapperId,
  })

  return {
    ...originalSpineItem,
    href: createManifestResourceHref({ baseUrl, resourcePath }),
    mediaType: IMAGE_WRAPPER_DOCUMENT_MEDIA_TYPE,
    pageSpreadLeft: undefined,
    pageSpreadRight: undefined,
    renditionFlow: `paginated`,
    renditionLayout: `reflowable`,
  }
}

const createImageWrapperManifestItem = ({
  href,
  mediaType,
  originalUri,
}: Pick<ManifestItem, "href" | "mediaType"> & {
  originalUri: string
}): ManifestItem => ({
  href,
  id: buildImageWrapperIdFromOriginalUri(originalUri),
  mediaType,
})

export const getArchiveRecordForManifestItem = ({
  archive,
  baseUrl,
  spineItem,
}: {
  archive: Archive
  baseUrl: string
  spineItem: Manifest["spineItems"][number]
}) => {
  const hrefCandidates = [spineItem.href, decodeManifestHref(spineItem.href)]
  const resourcePathCandidates = new Set(
    hrefCandidates.flatMap((href) => getResourcePathCandidates(href, baseUrl)),
  )

  return archive.records.find(
    (item) => !item.dir && resourcePathCandidates.has(item.uri),
  )
}

const decodeManifestHref = (href: string) => {
  try {
    return decodeURI(href)
  } catch {
    return href
  }
}

const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.endsWith(`/`) ? baseUrl : `${baseUrl}/`

const getResourcePathCandidates = (href: string, baseUrl: string) => {
  const candidates = [href]

  if (href.startsWith(`file://`)) {
    candidates.push(href.slice(`file://`.length))
  }

  if (baseUrl) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

    if (href.startsWith(normalizedBaseUrl)) {
      candidates.push(href.slice(normalizedBaseUrl.length))
    }
  }

  return candidates
}

export const mediaTypeFromArchiveRecord = (
  record:
    | {
        basename: string
        encodingFormat?: string
      }
    | undefined,
) =>
  parseContentType(record?.encodingFormat ?? ``) ||
  detectMimeTypeFromName(record?.basename ?? ``)

const mediaTypeFromArchiveRecordResourcePath = (
  record: Pick<ArchiveRecord, "basename" | "uri">,
) =>
  detectMimeTypeFromName(record.uri) || detectMimeTypeFromName(record.basename)

export const isPageSpreadSplitSupportedArchiveRecord = (
  record: ArchiveRecord | undefined,
): record is ArchiveFileRecord => {
  if (record === undefined || record.dir) return false

  const resourcePathMediaType = mediaTypeFromArchiveRecordResourcePath(record)

  if (!isPageSpreadSplitSupportedImage(resourcePathMediaType)) return false

  return isPageSpreadSplitSupportedImage(mediaTypeFromArchiveRecord(record))
}

export const pageSpreadSplit =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    if (isArchiveEpub(archive)) return manifest

    const imageWrapperManifestItems: ManifestItem[] = []
    const spineItems = manifest.spineItems.map((spineItem) => {
      const archiveRecord = getArchiveRecordForManifestItem({
        archive,
        baseUrl,
        spineItem,
      })

      if (!isPageSpreadSplitSupportedArchiveRecord(archiveRecord)) {
        return spineItem
      }

      const detected = detectPageSpreadFromBasename(archiveRecord.basename)

      if (detected === undefined) return spineItem

      const wrapperSpineItem = createImageWrapperSpineItem({
        baseUrl,
        originalSpineItem: spineItem,
        originalUri: archiveRecord.uri,
      })

      imageWrapperManifestItems.push(
        createImageWrapperManifestItem({
          href: wrapperSpineItem.href,
          mediaType: wrapperSpineItem.mediaType,
          originalUri: archiveRecord.uri,
        }),
      )

      return wrapperSpineItem
    })

    if (imageWrapperManifestItems.length === 0) return manifest

    return {
      ...manifest,
      spineItems: spineItems.map((spineItem, index) => ({
        ...spineItem,
        index,
      })),
      items: [...manifest.items, ...imageWrapperManifestItems],
    }
  }
