import type { XmlElement, XmlNodeBase } from "xmldoc"
import { XmlDocument } from "xmldoc"

export type ProjectGutenbergContributor = {
  readonly name: string
  /** MARC relator code, or `aut` for `dcterms:creator`. */
  readonly role: string
}

export type ProjectGutenbergCover = {
  readonly uri: string
  readonly mediaType?: string
}

/** The subset of one official per-eBook RDF record that we consume. */
export type ProjectGutenbergRecord = {
  readonly id: string
  readonly title?: string
  readonly publisher?: string
  readonly issued?: string
  /** Original print publication statement (`MARC 260`). */
  readonly originalPublication?: string
  readonly rights?: string
  readonly description?: string
  readonly summary?: string
  readonly languages?: ReadonlyArray<string>
  readonly subjects?: ReadonlyArray<string>
  readonly bookshelves?: ReadonlyArray<string>
  readonly contributors?: ReadonlyArray<ProjectGutenbergContributor>
  readonly cover?: ProjectGutenbergCover
}

const elementLocalName = (name: string): string =>
  name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name

const isXmlElement = (node: XmlNodeBase): node is XmlElement =>
  node.type === "element"

const childrenNamedLocal = (
  parent: XmlElement,
  localName: string,
): ReadonlyArray<XmlElement> =>
  parent.children.filter(
    (child): child is XmlElement =>
      isXmlElement(child) &&
      elementLocalName(child.name).toLowerCase() === localName.toLowerCase(),
  )

const childNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement | undefined => childrenNamedLocal(parent, localName)[0]

const text = (element: XmlElement | undefined): string | undefined => {
  const trimmed = element?.val.trim()

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

const attributeNamedLocal = (
  element: XmlElement,
  localName: string,
): string | undefined => {
  for (const [name, value] of Object.entries(element.attr)) {
    if (elementLocalName(name).toLowerCase() !== localName.toLowerCase()) {
      continue
    }

    const trimmed = value.trim()

    if (trimmed.length > 0) return trimmed
  }

  return undefined
}

const valuesFromDescriptions = (
  ebook: XmlElement,
  localName: string,
): ReadonlyArray<string> =>
  childrenNamedLocal(ebook, localName).flatMap((container) => {
    const description = childNamedLocal(container, "Description")
    const value = text(childNamedLocal(description ?? container, "value"))

    return value !== undefined ? [value] : []
  })

const projectGutenbergIdFromEbook = (ebook: XmlElement): string | undefined => {
  const about = attributeNamedLocal(ebook, "about")
  const id =
    about !== undefined ? /(?:^|\/)ebooks\/(\d+)$/.exec(about)?.[1] : undefined

  if (id === undefined) return undefined

  const normalized = id.replace(/^0+(?=\d)/, "")

  return normalized !== "0" ? normalized : undefined
}

const contributorsFromEbook = (
  ebook: XmlElement,
): ReadonlyArray<ProjectGutenbergContributor> => {
  const contributors: ProjectGutenbergContributor[] = []

  for (const child of ebook.children) {
    if (!isXmlElement(child)) continue

    const isCreator = child.name.toLowerCase() === "dcterms:creator"
    const isMarcRelator = child.name.toLowerCase().startsWith("marcrel:")

    if (!isCreator && !isMarcRelator) continue

    const name = text(
      childNamedLocal(childNamedLocal(child, "agent") ?? child, "name"),
    )

    if (name === undefined) continue

    contributors.push({
      name,
      role: isCreator ? "aut" : elementLocalName(child.name).toLowerCase(),
    })
  }

  return contributors
}

const subjectValuesFromEbook = (ebook: XmlElement): ReadonlyArray<string> =>
  childrenNamedLocal(ebook, "subject").flatMap((container) => {
    const description = childNamedLocal(container, "Description")
    const memberOf =
      description !== undefined
        ? attributeNamedLocal(
            childNamedLocal(description, "memberOf") ?? description,
            "resource",
          )
        : undefined
    const value = text(
      description !== undefined
        ? childNamedLocal(description, "value")
        : undefined,
    )

    return value !== undefined && memberOf?.endsWith("/LCSH") === true
      ? [value]
      : []
  })

const coverFromEbook = (
  ebook: XmlElement,
): ProjectGutenbergCover | undefined => {
  const covers = childrenNamedLocal(ebook, "hasFormat").flatMap(
    (formatContainer) => {
      const file = childNamedLocal(formatContainer, "file")

      if (file === undefined) return []

      const uri = attributeNamedLocal(file, "about")
      const mediaType = childrenNamedLocal(file, "format")
        .map((format) => {
          const description = childNamedLocal(format, "Description")

          return text(childNamedLocal(description ?? format, "value"))
        })
        .find((value) => value?.startsWith("image/") === true)

      if (
        uri === undefined ||
        mediaType === undefined ||
        !/\.cover\.(?:medium|small)\.[a-z0-9]+(?:$|[?#])/i.test(uri)
      ) {
        return []
      }

      return [{ uri, mediaType }]
    },
  )

  return (
    covers.find((cover) => /\.cover\.medium\./i.test(cover.uri)) ?? covers[0]
  )
}

const emptyToUndefined = <T>(
  values: ReadonlyArray<T>,
): ReadonlyArray<T> | undefined => (values.length > 0 ? values : undefined)

/**
 * Parses one official Project Gutenberg per-eBook RDF document. Unsupported
 * XML yields `undefined`; malformed XML throws with a provider-specific label.
 */
export const parseProjectGutenbergRdf = (
  xml: string,
): ProjectGutenbergRecord | undefined => {
  let document: XmlDocument

  try {
    document = new XmlDocument(xml)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Project Gutenberg RDF is malformed: ${message}`, { cause })
  }

  if (elementLocalName(document.name).toLowerCase() !== "rdf") {
    return undefined
  }

  const ebook = childNamedLocal(document, "ebook")

  if (ebook === undefined) return undefined

  const id = projectGutenbergIdFromEbook(ebook)

  if (id === undefined) return undefined

  const languages = [...new Set(valuesFromDescriptions(ebook, "language"))]
  const subjects = [...new Set(subjectValuesFromEbook(ebook))]
  const bookshelves = [...new Set(valuesFromDescriptions(ebook, "bookshelf"))]
  const contributors = contributorsFromEbook(ebook)

  return {
    id,
    title: text(childNamedLocal(ebook, "title")),
    publisher: text(childNamedLocal(ebook, "publisher")),
    issued: text(childNamedLocal(ebook, "issued")),
    originalPublication: text(childNamedLocal(ebook, "marc260")),
    rights: text(childNamedLocal(ebook, "rights")),
    description: text(childNamedLocal(ebook, "description")),
    summary: text(childNamedLocal(ebook, "marc520")),
    languages: emptyToUndefined(languages),
    subjects: emptyToUndefined(subjects),
    bookshelves: emptyToUndefined(bookshelves),
    contributors: emptyToUndefined(contributors),
    cover: coverFromEbook(ebook),
  }
}
