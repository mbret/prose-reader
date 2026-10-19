import { XmlDocument } from "xmldoc"
import {
  type Archive,
  type FileRecord,
  isFileRecord,
} from "../../archives/types.ts"
import {
  childNamedLocal,
  childrenNamedLocal,
} from "../../utils/xmlLocalNames.ts"

/**
 * The OCF container file. Every EPUB holds it (EPUB 3.3, OCF, "Container
 * file"), and no archive prose synthesizes does: those for a PDF, a text or a
 * list of URLs hold a package document of their own, without one.
 */
const OCF_CONTAINER_FILE_URI = "meta-inf/container.xml"

/** The media type a `rootfile` gives a package document. */
const PACKAGE_DOCUMENT_MEDIA_TYPE = "application/oebps-package+xml"

/** The archive's OCF container file, its path matched ASCII case-insensitively. */
export const getArchiveOcfContainerRecord = (
  archive: Archive,
): FileRecord | undefined =>
  archive.records
    .filter(isFileRecord)
    .find((record) => record.uri.toLowerCase() === OCF_CONTAINER_FILE_URI)

/**
 * The `full-path` of each package document an OCF container file lists, in its
 * order: a URL relative to the root of the container (EPUB 3.3, "The rootfile
 * element"). A `rootfile` declaring another media type, as an EPUB 2 container
 * lists a PDF rendition, is left out; one declaring none is kept.
 */
export const parseOcfContainerPackageDocumentPaths = (
  containerXml: string,
): string[] => {
  const rootfiles = childNamedLocal(new XmlDocument(containerXml), "rootfiles")

  if (!rootfiles) return []

  return childrenNamedLocal(rootfiles, "rootfile").flatMap((rootfile) => {
    const fullPath = rootfile.attr["full-path"]?.trim()
    const mediaType = rootfile.attr["media-type"]?.trim().toLowerCase()
    const isPackageDocument =
      mediaType === undefined || mediaType === PACKAGE_DOCUMENT_MEDIA_TYPE

    return fullPath && isPackageDocument ? [fullPath] : []
  })
}
