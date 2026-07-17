import {
  detectMimeTypeFromName,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"
import {
  type Archive,
  createManifestResourceHref,
  createXmlSafeId,
} from "@prose-reader/streamer"
import { alignSpineItemsForSpreadParity } from "./alignSpineItemsForSpreadParity"
import { detectPanoramaFromBasename } from "./detectPanoramaFromBasename"

export {
  type DetectedPanorama,
  detectPanoramaFromBasename,
} from "./detectPanoramaFromBasename"

export type PanoramaCropSide = "left" | "right"

export type VirtualPanoramaResource = {
  originalUri: string
  cropSide: PanoramaCropSide
}

export const PANORAMA_RESOURCE_PREFIX = `__prose-reader__/panorama`
export const PANORAMA_SPLIT_DOCUMENT_MEDIA_TYPE = `application/xhtml+xml`

const supportedImageMediaTypes = new Set([
  `image/jpg`,
  `image/jpeg`,
  `image/png`,
  `image/webp`,
])

export const isPanoramaSplitSupportedImage = (mimeType: string | undefined) => {
  if (mimeType === undefined) return false

  return supportedImageMediaTypes.has(mimeType)
}

type SpineItem = Manifest["spineItems"][number]
type ManifestItem = Manifest["items"][number]
type ArchiveRecord = Archive["records"][number]
type ArchiveFileRecord = Extract<ArchiveRecord, { dir: false }>

const encodeOriginalUriSegment = (uri: string) => encodeURIComponent(uri)

const hasOpfExtension = (path: string) => path.toLowerCase().endsWith(`.opf`)

const isArchiveEpub = (archive: Archive) =>
  archive.records.some(
    (file) =>
      !file.dir &&
      (hasOpfExtension(file.basename) || hasOpfExtension(file.uri)),
  )

export const buildVirtualPanoramaResourcePath = ({
  cropSide,
  originalUri,
}: {
  originalUri: string
  cropSide: PanoramaCropSide
}) => {
  return `${PANORAMA_RESOURCE_PREFIX}/${encodeOriginalUriSegment(originalUri)}/${cropSide}.xhtml`
}

const spreadPropertiesForSide = (
  side: PanoramaCropSide,
): Pick<SpineItem, "pageSpreadLeft" | "pageSpreadRight"> =>
  side === `left`
    ? { pageSpreadLeft: true, pageSpreadRight: undefined }
    : { pageSpreadLeft: undefined, pageSpreadRight: true }

const cropSidesInReadingOrder = (
  readingDirection: Manifest["readingDirection"],
): [PanoramaCropSide, PanoramaCropSide] =>
  readingDirection === `rtl` ? [`right`, `left`] : [`left`, `right`]

const createVirtualSpineItem = ({
  baseUrl,
  cropSide,
  label,
  originalSpineItem,
  originalUri,
  progressionWeight,
}: {
  baseUrl: string
  originalSpineItem: SpineItem
  originalUri: string
  label: string
  cropSide: PanoramaCropSide
  progressionWeight: number | undefined
}): SpineItem => {
  const resourcePath = buildVirtualPanoramaResourcePath({
    cropSide,
    originalUri,
  })

  return {
    ...originalSpineItem,
    id: createXmlSafeId(`${originalSpineItem.id}.${label}`),
    href: createManifestResourceHref({ baseUrl, resourcePath }),
    mediaType: PANORAMA_SPLIT_DOCUMENT_MEDIA_TYPE,
    progressionWeight,
    renditionLayout: `pre-paginated`,
    ...spreadPropertiesForSide(cropSide),
  }
}

const createVirtualManifestItem = ({
  href,
  id,
  mediaType,
}: Pick<ManifestItem, "href" | "id" | "mediaType">): ManifestItem => ({
  href,
  id,
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
}): ArchiveRecord | undefined => {
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

export const isPanoramaSplitSupportedArchiveRecord = (
  record: ArchiveRecord | undefined,
): record is ArchiveFileRecord => {
  if (record === undefined || record.dir) return false

  const resourcePathMediaType = mediaTypeFromArchiveRecordResourcePath(record)

  if (!isPanoramaSplitSupportedImage(resourcePathMediaType)) return false

  return isPanoramaSplitSupportedImage(mediaTypeFromArchiveRecord(record))
}

export const panoramaSplit =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    if (isArchiveEpub(archive)) return manifest

    const virtualManifestItems: ManifestItem[] = []
    const spineItems = manifest.spineItems.flatMap((spineItem) => {
      const archiveRecord = getArchiveRecordForManifestItem({
        archive,
        baseUrl,
        spineItem,
      })

      if (!isPanoramaSplitSupportedArchiveRecord(archiveRecord)) {
        return [spineItem]
      }

      const detected = detectPanoramaFromBasename(archiveRecord.basename)

      if (detected === undefined) return [spineItem]

      const [firstCropSide, secondCropSide] = cropSidesInReadingOrder(
        manifest.readingDirection,
      )
      const splitProgressionWeight =
        spineItem.progressionWeight !== undefined
          ? spineItem.progressionWeight / 2
          : undefined
      const firstSpineItem = createVirtualSpineItem({
        baseUrl,
        cropSide: firstCropSide,
        label: detected.firstPageLabel,
        originalSpineItem: spineItem,
        originalUri: archiveRecord.uri,
        progressionWeight: splitProgressionWeight,
      })
      const secondSpineItem = createVirtualSpineItem({
        baseUrl,
        cropSide: secondCropSide,
        label: detected.secondPageLabel,
        originalSpineItem: spineItem,
        originalUri: archiveRecord.uri,
        progressionWeight: splitProgressionWeight,
      })

      virtualManifestItems.push(
        createVirtualManifestItem(firstSpineItem),
        createVirtualManifestItem(secondSpineItem),
      )

      return [firstSpineItem, secondSpineItem]
    })

    const alignedSpineItems = alignSpineItemsForSpreadParity({
      readingDirection: manifest.readingDirection,
      spineItems,
    })

    if (virtualManifestItems.length === 0 && alignedSpineItems === spineItems) {
      return manifest
    }

    return {
      ...manifest,
      spineItems: alignedSpineItems.map((spineItem, index) => ({
        ...spineItem,
        index,
      })),
      items: [...manifest.items, ...virtualManifestItems],
    }
  }
