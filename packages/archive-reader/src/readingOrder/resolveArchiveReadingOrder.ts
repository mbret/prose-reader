import {
  detectMimeTypeFromName,
  isMediaContentMimeType,
  parseContentType,
} from "@prose-reader/shared"
import { APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME } from "../apple/parse"
import type { Archive, FileRecord } from "../archives/types"
import { getArchiveFileRecordByUri, isFileRecord } from "../archives/types"
import { COMIC_INFO_FILENAME } from "../comicInfo/parse"
import { KOBO_DISPLAY_OPTIONS_FILENAME } from "../kobo/parse"
import type { ArchiveOpfParsed } from "../opf/readArchiveOpf"
import { readArchiveOpf } from "../opf/readArchiveOpf"
import { omitUndefined } from "../utils/omitUndefined"
import { toContainerUri } from "../utils/toContainerUri"

/**
 * One resource of the publication's default reading sequence, in the
 * container's coordinate space: `uri` addresses the archive record (no
 * serving base baked in — consumers rebase into their own space), except
 * for remote resources authored as absolute http(s) URLs, which pass
 * through as-is.
 */
export type ArchiveReadingOrderItem = {
  readonly uri: string
  /** OPF manifest item id, when the container has a package document. */
  readonly id?: string
  readonly mediaType?: string
  /** Uncompressed byte length from the archive record, when known. */
  readonly size?: number
  /**
   * Resolved per-item layout: the itemref override when authored, else the
   * package-level `rendition:layout`, else (non-EPUB) `pre-paginated` for
   * discrete media (images, audio, video). Container sidecars (Apple/Kobo
   * display options) deliberately do not contribute here — they only inform
   * the publication-level layout in the resolved metadata.
   */
  readonly renditionLayout?: "reflowable" | "pre-paginated"
  readonly renditionFlow?:
    | "scrolled-continuous"
    | "scrolled-doc"
    | "paginated"
    | "auto"
  readonly pageSpreadLeft?: true
  readonly pageSpreadRight?: true
  /**
   * Share of the publication's total progression, in [0, 1], summing to ~1:
   * size-proportional for EPUBs (document length is a fair pagination
   * proxy), an equal split otherwise (an image's byte size says nothing
   * about its reading time).
   */
  readonly progressionWeight: number
}

const validatedPackageLayout = (
  raw: string | undefined,
): "reflowable" | "pre-paginated" | undefined => {
  const v = raw?.trim().toLowerCase()
  return v === "reflowable" || v === "pre-paginated" ? v : undefined
}

const readingOrderFromOpf = (
  archive: Archive,
  { opf, basePath }: ArchiveOpfParsed,
): ArchiveReadingOrderItem[] => {
  const packageLayout = validatedPackageLayout(opf.renditionLayoutMeta)

  const rows = opf.spineRows.map((row) => {
    const uri = toContainerUri(row.href, basePath)
    const record = getArchiveFileRecordByUri(archive, uri)

    return { row, uri, record }
  })

  const totalSize = rows.reduce(
    (total, { record }) => total + (record?.size ?? 0),
    0,
  )

  return rows.map(({ row, uri, record }) =>
    omitUndefined({
      uri,
      id: row.id,
      mediaType: row.mediaType ?? record?.encodingFormat,
      size: record?.size,
      renditionLayout: row.renditionLayout ?? packageLayout,
      renditionFlow: row.renditionFlow,
      pageSpreadLeft: row.pageSpreadLeft,
      pageSpreadRight: row.pageSpreadRight,
      progressionWeight:
        totalSize > 0
          ? (record?.size ?? 0) / totalSize
          : 1 / opf.spineRows.length,
    }),
  )
}

const comicInfoBasenameLower = COMIC_INFO_FILENAME.toLowerCase()
const appleDisplayOptionsBasenameLower =
  APPLE_IBOOKS_DISPLAY_OPTIONS_FILENAME.toLowerCase()

/**
 * Container sidecars describe the publication, they are not content: they
 * never belong to the reading order of a sidecar-driven archive (CBZ with
 * ComicInfo.xml, Kobo/Apple-flagged containers), and neither do OS litter
 * files such as `Thumbs.db`.
 */
const isSidecarOrLitterRecord = (record: FileRecord): boolean => {
  const basenameLower = record.basename.toLowerCase()

  return (
    basenameLower === comicInfoBasenameLower ||
    basenameLower === appleDisplayOptionsBasenameLower ||
    record.uri.endsWith(KOBO_DISPLAY_OPTIONS_FILENAME) ||
    basenameLower.endsWith(`.db`)
  )
}

const readingOrderFromRecords = (
  archive: Archive,
): ArchiveReadingOrderItem[] => {
  const files = archive.records
    .filter(isFileRecord)
    .filter((record) => !isSidecarOrLitterRecord(record))

  return files.map((record) => {
    const mediaType =
      parseContentType(record.encodingFormat ?? "") ||
      detectMimeTypeFromName(record.basename)

    return omitUndefined({
      uri: record.uri,
      mediaType,
      size: record.size,
      renditionLayout:
        mediaType !== undefined && isMediaContentMimeType(mediaType)
          ? ("pre-paginated" as const)
          : undefined,
      progressionWeight: 1 / files.length,
    })
  })
}

/**
 * Resolves the publication's default reading sequence from the container:
 * the OPF spine when a package document exists, the archive's file listing
 * otherwise (sidecars and OS litter excluded). Costs one OPF read at most —
 * pass `opf` (an already parsed `readArchiveOpf` result) to skip the
 * internal lookup, e.g. alongside `resolveArchiveToc`.
 */
export const resolveArchiveReadingOrder = async (
  archive: Archive,
  { opf }: { opf?: ArchiveOpfParsed } = {},
): Promise<ArchiveReadingOrderItem[]> => {
  // A malformed package document is treated as no package document: the
  // reading order always degrades to the archive's file listing rather than
  // throwing (books in the wild are dirty). `resolveArchive` reads and
  // reports the OPF once, then threads it here — passing `undefined` when
  // that read failed — so this fallback read must swallow the same parse
  // error too, otherwise it would re-surface and escape the lenient resolve.
  const archiveOpf =
    opf ?? (await readArchiveOpf(archive).catch(() => undefined))

  if (archiveOpf) return readingOrderFromOpf(archive, archiveOpf)

  return readingOrderFromRecords(archive)
}
