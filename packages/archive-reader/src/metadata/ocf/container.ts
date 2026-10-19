import { XmlDocument, type XmlElement } from "xmldoc"
import {
  type Archive,
  type FileRecord,
  isFileRecord,
} from "../../archives/types.ts"
import { childrenNamedLocal } from "../../utils/xmlLocalNames.ts"
import {
  type XmlNamespaceScope,
  xmlNamespaceScope,
} from "../../utils/xmlNamespaceScope.ts"

/**
 * The OCF container file. Every EPUB holds it (EPUB 3.3, OCF, "Container
 * file"), and no archive prose synthesizes does: those for a PDF, a text or a
 * list of URLs hold a package document of their own, without one.
 */
const OCF_CONTAINER_FILE_URI = "meta-inf/container.xml"

/** The media type a `rootfile` gives a package document. */
const PACKAGE_DOCUMENT_MEDIA_TYPE = "application/oebps-package+xml"

/** The namespace of the container file's own elements. */
const OCF_CONTAINER_NAMESPACE =
  "urn:oasis:names:tc:opendocument:xmlns:container"

/** The namespace bindings in force at an element: its default and prefixed ones. */
type ElementNamespaces = {
  readonly defaultNamespace: string | undefined
  readonly prefixes: XmlNamespaceScope
}

const namespacesAt = (
  element: XmlElement,
  inherited: ElementNamespaces,
): ElementNamespaces => ({
  defaultNamespace: element.attr.xmlns?.trim() ?? inherited.defaultNamespace,
  prefixes: xmlNamespaceScope(element.attr, inherited.prefixes),
})

/**
 * Whether an element is one of the container file's own, rather than one of
 * another namespace, which EPUB 3.3 removes, with its content, before reading
 * the file. One in no declared namespace counts as its own: books in the wild
 * omit the declaration.
 */
const isContainerElement = (
  element: XmlElement,
  namespaces: ElementNamespaces,
) => {
  const separator = element.name.indexOf(":")
  const namespace =
    separator < 0
      ? namespaces.defaultNamespace
      : namespaces.prefixes[element.name.slice(0, separator)]

  return namespace === undefined || namespace === OCF_CONTAINER_NAMESPACE
}

/** The children of a local name that are the container file's own elements. */
const containerChildrenNamed = (
  parent: XmlElement,
  parentNamespaces: ElementNamespaces,
  localName: string,
) =>
  childrenNamedLocal(parent, localName).flatMap((element) => {
    const namespaces = namespacesAt(element, parentNamespaces)

    return isContainerElement(element, namespaces)
      ? [{ element, namespaces }]
      : []
  })

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
  const container = new XmlDocument(containerXml)
  const containerNamespaces = namespacesAt(container, {
    defaultNamespace: undefined,
    prefixes: {},
  })

  if (!isContainerElement(container, containerNamespaces)) return []

  const [rootfiles] = containerChildrenNamed(
    container,
    containerNamespaces,
    "rootfiles",
  )

  if (!rootfiles) return []

  return containerChildrenNamed(
    rootfiles.element,
    rootfiles.namespaces,
    "rootfile",
  ).flatMap(({ element: rootfile }) => {
    const fullPath = rootfile.attr["full-path"]?.trim()
    const mediaType = rootfile.attr["media-type"]?.trim().toLowerCase()
    const isPackageDocument =
      mediaType === undefined || mediaType === PACKAGE_DOCUMENT_MEDIA_TYPE

    return fullPath && isPackageDocument ? [fullPath] : []
  })
}
