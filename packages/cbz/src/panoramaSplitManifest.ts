import {
  type Archive,
  getArchiveFileRecordByUri,
  isArchiveEpub,
} from "@prose-reader/archive-reader"
import {
  createXmlSafeId,
  detectMimeTypeFromName,
  type Manifest,
  parseContentType,
} from "@prose-reader/shared"
import { createManifestResourceHref } from "@prose-reader/streamer"
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
  `image/avif`,
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
      const archiveRecord = getArchiveFileRecordByUri(
        archive,
        spineItem.containerUri,
      )

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
