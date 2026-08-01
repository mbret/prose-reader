import { detectMimeTypeFromName, parseContentType } from "@prose-reader/shared"
import type { Archive } from "../archives/types.ts"
import { getArchiveFileRecordByUri } from "../archives/types.ts"
import type { ArchiveOpfParsed } from "../opf/readArchiveOpf.ts"
import { readArchiveOpf } from "../opf/readArchiveOpf.ts"
import type { ArchiveReadingOrderItem } from "../readingOrder/resolveArchiveReadingOrder.ts"
import { resolveArchiveReadingOrder } from "../readingOrder/resolveArchiveReadingOrder.ts"
import type { ResolvedCover } from "../types/resolvedMetadata.ts"
import { omitUndefined } from "../utils/omitUndefined.ts"
import { toContainerUri } from "../utils/toContainerUri.ts"

const mediaTypeForUri = (archive: Archive, uri: string): string | undefined => {
  const record = getArchiveFileRecordByUri(archive, uri)

  if (record === undefined) return undefined

  return (
    parseContentType(record.encodingFormat ?? "") ||
    detectMimeTypeFromName(record.basename)
  )
}

/**
 * Resolves the publication's cover resource.
 *
 * Resolution order:
 *
 *  1. **OPF cover** — the manifest cover image (`cover-image` property, the
 *     EPUB 2 `<meta name="cover">` convention, or a `cover`-ish image id; see
 *     {@link OpfMetadata.coverHref}), rebased onto the package document's base
 *     path. A package document that declares no cover is authoritative: no
 *     interior image is promoted to cover, so the result is `undefined`.
 *  2. **Package-less containers** (CBZ, folder of images, URL list) — the
 *     first reading-order resource, the conventional first page. Sidecars and
 *     OS litter are already excluded from the reading order, so this never
 *     picks `ComicInfo.xml` or `Thumbs.db`.
 *
 * `undefined` when neither applies (an empty container, or an OPF without a
 * declared cover). Costs one OPF read at most — pass an already parsed `opf`
 * and/or the already resolved `readingOrder` to skip the internal lookups
 * (e.g. alongside `resolveArchive`).
 */
export const resolveArchiveCover = async (
  archive: Archive,
  {
    opf,
    readingOrder,
  }: {
    opf?: ArchiveOpfParsed
    readingOrder?: ArchiveReadingOrderItem[]
  } = {},
): Promise<ResolvedCover | undefined> => {
  // A malformed package document is treated as no package document, mirroring
  // resolveArchiveReadingOrder: the cover degrades to the first-page fallback
  // rather than throwing (books in the wild are dirty).
  const archiveOpf =
    opf ?? (await readArchiveOpf(archive).catch(() => undefined))

  // 1. an OPF-declared cover is authoritative.
  if (archiveOpf !== undefined && archiveOpf.opf.coverHref !== undefined) {
    const uri = toContainerUri(archiveOpf.opf.coverHref, archiveOpf.basePath)

    return omitUndefined({
      uri,
      mediaType: mediaTypeForUri(archive, uri),
      confidence: "derived" as const,
    })
  }

  // 2. no declared cover — assume the first image of the reading order. This
  // holds whether or not a package document exists: an authored reflowable
  // EPUB has a text spine with no image items, so it stays undefined rather
  // than promoting an interior illustration (a manifest resource, not a spine
  // item); only image-content publications resolve a cover here — comics,
  // image archives, and synthetic image-spine OPFs (e.g. createArchiveFromUrls
  // lists, whose generated OPF carries no cover marker). Audio/video are
  // pre-paginated discrete media but not images, so they are skipped too.
  const order =
    readingOrder ??
    (await resolveArchiveReadingOrder(archive, { opf: archiveOpf }))
  const firstImage = order.find(
    (item) => item.mediaType?.startsWith("image/") === true,
  )

  if (firstImage === undefined) return undefined

  // the reading order already computed the media type the same way
  return omitUndefined({
    uri: firstImage.uri,
    mediaType: firstImage.mediaType,
    confidence: "assumed" as const,
  })
}
