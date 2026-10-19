import { readRecordAsText } from "../../archives/readRecordAsText.ts"
import {
  type Archive,
  type ArchiveRecord,
  type FileRecord,
  getArchiveFileRecordByUri,
  isFileRecord,
} from "../../archives/types.ts"
import { toContainerUri } from "../../utils/toContainerUri.ts"
import {
  getArchiveOcfContainerRecord,
  parseOcfContainerPackageDocumentPaths,
} from "../ocf/container.ts"

const hasOpfExtension = (path: string) => path.toLowerCase().endsWith(`.opf`)

/** Whether a record is named as a package document is, `.opf` in any case. */
export const isOpfRecord = (record: ArchiveRecord): record is FileRecord =>
  isFileRecord(record) &&
  (hasOpfExtension(record.basename) || hasOpfExtension(record.uri))

/**
 * The package documents the archive's OCF container file lists, in its order.
 * A container file that cannot be read or parsed lists none, so that its
 * package document is still found the way an archive without one finds it.
 */
const readListedPackageDocumentPaths = async (
  archive: Archive,
): Promise<string[]> => {
  const containerRecord = getArchiveOcfContainerRecord(archive)

  if (!containerRecord) return []

  try {
    return parseOcfContainerPackageDocumentPaths(
      await readRecordAsText(containerRecord),
    )
  } catch {
    return []
  }
}

/**
 * The record of the package document the book is read from.
 *
 * An EPUB lists its package documents in `META-INF/container.xml` (EPUB 3.3,
 * OCF, "Container file"), one per rendition of the publication. The first is
 * the default rendition (EPUB Multiple-Rendition Publications), the one a
 * reading system that does not choose between renditions opens. A listed one
 * the archive does not hold is passed over.
 *
 * Without a container file, or with one that lists no package document the
 * archive holds, the first `.opf` record stands in: the archives prose
 * synthesizes for a PDF, a text or a list of URLs hold one and no container
 * file, and books in the wild misname theirs.
 */
export const getArchiveOpfRecord = async (
  archive: Archive,
): Promise<FileRecord | undefined> => {
  for (const path of await readListedPackageDocumentPaths(archive)) {
    const record = getArchiveFileRecordByUri(archive, toContainerUri(path, ``))

    if (record) return record
  }

  return archive.records.find(isOpfRecord)
}
