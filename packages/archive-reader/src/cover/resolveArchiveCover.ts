import { detectMimeTypeFromName, parseContentType } from "@prose-reader/shared"
import type { Archive } from "../archives/types"
import { getArchiveFileRecordByUri } from "../archives/types"
import type { ArchiveOpfParsed } from "../opf/readArchiveOpf"
import { readArchiveOpf } from "../opf/readArchiveOpf"
import type { ArchiveReadingOrderItem } from "../readingOrder/resolveArchiveReadingOrder"
import { resolveArchiveReadingOrder } from "../readingOrder/resolveArchiveReadingOrder"
import type { ResolvedCover } from "../types/resolvedMetadata"
import { omitUndefined } from "../utils/omitUndefined"
import { toContainerUri } from "../utils/toContainerUri"

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

  if (archiveOpf !== undefined) {
    const coverHref = archiveOpf.opf.coverHref

    if (coverHref === undefined) return undefined

    const uri = toContainerUri(coverHref, archiveOpf.basePath)

    return omitUndefined({
      uri,
      mediaType: mediaTypeForUri(archive, uri),
      confidence: "derived" as const,
    })
  }

  const order = readingOrder ?? (await resolveArchiveReadingOrder(archive))
  const first = order[0]

  if (first === undefined) return undefined

  // the reading order already computed the media type the same way
  return omitUndefined({
    uri: first.uri,
    mediaType: first.mediaType,
    confidence: "assumed" as const,
  })
}
