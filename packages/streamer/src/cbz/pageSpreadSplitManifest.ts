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

export type PageSpreadCropSide = "left" | "right"

export type VirtualPageSpreadResource = {
  originalUri: string
  cropSide: PageSpreadCropSide
}

export const PAGE_SPREAD_RESOURCE_PREFIX = `__prose-reader__/page-spread`
export const PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE = `application/xhtml+xml`

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

const encodeOriginalUriSegment = (uri: string) => encodeURIComponent(uri)

export const buildVirtualPageSpreadResourcePath = ({
  cropSide,
  originalUri,
}: {
  originalUri: string
  cropSide: PageSpreadCropSide
}) => {
  return `${PAGE_SPREAD_RESOURCE_PREFIX}/${encodeOriginalUriSegment(originalUri)}/${cropSide}.xhtml`
}

const spreadPropertiesForSide = (
  side: PageSpreadCropSide,
): Pick<SpineItem, "pageSpreadLeft" | "pageSpreadRight"> =>
  side === `left`
    ? { pageSpreadLeft: true, pageSpreadRight: undefined }
    : { pageSpreadLeft: undefined, pageSpreadRight: true }

const cropSidesInReadingOrder = (
  readingDirection: Manifest["readingDirection"],
): [PageSpreadCropSide, PageSpreadCropSide] =>
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
  cropSide: PageSpreadCropSide
  progressionWeight: number | undefined
}): SpineItem => {
  const resourcePath = buildVirtualPageSpreadResourcePath({
    cropSide,
    originalUri,
  })

  return {
    ...originalSpineItem,
    id: `${originalSpineItem.id}.${label}`,
    href: createManifestResourceHref({ baseUrl, resourcePath }),
    mediaType: PAGE_SPREAD_SPLIT_DOCUMENT_MEDIA_TYPE,
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
  spineItem,
}: {
  archive: Archive
  spineItem: Manifest["spineItems"][number]
}) =>
  archive.records.find(
    (item) => !item.dir && decodeURI(spineItem.href).endsWith(item.uri),
  )

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

    const virtualManifestItems: ManifestItem[] = []
    const spineItems = manifest.spineItems.flatMap((spineItem) => {
      const archiveRecord = getArchiveRecordForManifestItem({
        archive,
        spineItem,
      })

      if (!isPageSpreadSplitSupportedArchiveRecord(archiveRecord)) {
        return [spineItem]
      }

      const detected = detectPageSpreadFromBasename(archiveRecord.basename)

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

    if (virtualManifestItems.length === 0) return manifest

    return {
      ...manifest,
      spineItems: spineItems.map((spineItem, index) => ({
        ...spineItem,
        index,
      })),
      items: [...manifest.items, ...virtualManifestItems],
    }
  }
