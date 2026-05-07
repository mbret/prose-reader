import type { XmlElement, XmlNodeBase } from "xmldoc"
import { XmlDocument } from "xmldoc"
import { tokenizeXmlSpaceSeparatedList } from "../utils/tokenizeXmlSpaceSeparatedList"
import { layoutHintsFromItemrefProperties } from "./spineItemrefProperties"

export type OpfSpineManifestItem = {
  readonly id: string
  readonly href: string
  readonly mediaType?: string
  readonly properties?: string
}

export type OpfIdentifier = {
  readonly value: string
  readonly scheme?: string
}

export type OpfSpineRow = {
  readonly idref: string
  readonly id: string
  readonly href: string
  readonly mediaType?: string
  readonly properties?: string
  readonly renditionLayout?: `reflowable` | `pre-paginated`
  readonly pageSpreadLeft?: true
  readonly pageSpreadRight?: true
}

export type OpfGuideReference = {
  readonly href: string
  readonly title: string
  readonly type: string
}

const elementLocalName = (name: string): string =>
  name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name

const localNameEq = (elementName: string, wantLocal: string): boolean =>
  elementLocalName(elementName).toLowerCase() === wantLocal.toLowerCase()

const isXmlElement = (node: XmlNodeBase): node is XmlElement =>
  node.type === "element"

const childNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement | undefined => {
  for (const node of parent.children) {
    if (!isXmlElement(node)) continue
    if (localNameEq(node.name, localName)) return node
  }
  return undefined
}

const childrenNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement[] => {
  const out: XmlElement[] = []
  for (const node of parent.children) {
    if (!isXmlElement(node)) continue
    if (localNameEq(node.name, localName)) out.push(node)
  }
  return out
}

const identifiersFromMetadata = (metadataEl: XmlElement): OpfIdentifier[] => {
  const identifiers: OpfIdentifier[] = []

  metadataEl.eachChild((child) => {
    if (elementLocalName(child.name).toLowerCase() !== "identifier") return

    const value = child.val.trim()
    if (value.length === 0) return

    const scheme =
      child.attr["opf:scheme"] ?? child.attr["opf:Scheme"] ?? child.attr.scheme
    const schemeTrimmed = scheme?.trim()

    identifiers.push({
      value,
      ...(schemeTrimmed !== undefined && schemeTrimmed.length > 0
        ? { scheme: schemeTrimmed }
        : {}),
    })
  })

  return identifiers
}

const firstTextByLocalName = (
  metadataEl: XmlElement,
  localName: string,
): string | undefined => {
  let found: string | undefined
  metadataEl.eachChild((child) => {
    if (found !== undefined) return
    if (elementLocalName(child.name).toLowerCase() !== localName.toLowerCase())
      return
    const t = child.val.trim()
    if (t.length > 0) found = t
  })
  return found
}

const textsByLocalName = (
  metadataEl: XmlElement,
  localName: string,
): string[] => {
  const out: string[] = []
  metadataEl.eachChild((child) => {
    if (elementLocalName(child.name).toLowerCase() !== localName.toLowerCase())
      return
    const t = child.val.trim()
    if (t.length > 0) out.push(t)
  })
  return out
}

const coverContentIdFromMetadata = (
  metadataEl: XmlElement,
): string | undefined => {
  let coverId: string | undefined
  metadataEl.eachChild((child) => {
    if (coverId !== undefined) return
    if (elementLocalName(child.name).toLowerCase() !== "meta") return
    if (child.attr.name?.toLowerCase() !== "cover") return
    const content = child.attr.content?.trim()
    if (content !== undefined && content.length > 0) coverId = content
  })
  return coverId
}

/**
 * EPUB cover image inside the manifest. Resolution order, matching
 * what the spec lays out and what the bulk of EPUB producers in the
 * wild rely on:
 *
 *  1. EPUB 3 — the manifest item carrying the `cover-image` token in
 *     its `properties` attribute (§ D.6.1).
 *  2. EPUB 2 — `<meta name="cover" content="ID"/>` in `metadata`,
 *     resolved to the manifest item with that `id`.
 *  3. Last-resort fallback — any image manifest item whose `id`
 *     contains the substring `cover` (case-insensitive); covers the
 *     long tail of producers that emit neither the EPUB 3 property
 *     nor the EPUB 2 meta.
 *
 * Each step requires the candidate manifest item to advertise an
 * `image/*` media type so non-image artefacts named `cover` (XHTML
 * cover pages, NCX entries) don't slip through.
 */
const coverHrefFromManifestAndMetadata = ({
  manifestItems,
  metadataEl,
}: {
  manifestItems: ReadonlyArray<OpfSpineManifestItem>
  metadataEl: XmlElement | undefined
}): string | undefined => {
  const isImage = (item: OpfSpineManifestItem): boolean =>
    item.mediaType?.toLowerCase().includes("image/") === true

  const byCoverImageProperty = manifestItems.find((item) => {
    if (!isImage(item)) return false
    return tokenizeXmlSpaceSeparatedList(item.properties).includes(
      "cover-image",
    )
  })
  if (byCoverImageProperty !== undefined) return byCoverImageProperty.href

  if (metadataEl !== undefined) {
    const coverContentId = coverContentIdFromMetadata(metadataEl)
    if (coverContentId !== undefined) {
      const match = manifestItems.find(
        (item) => item.id === coverContentId && isImage(item),
      )
      if (match !== undefined) return match.href
    }
  }

  return manifestItems.find(
    (item) => item.id.toLowerCase().includes("cover") && isImage(item),
  )?.href
}

const metaValByProperty = (
  metadataEl: XmlElement,
  property: string,
): string | undefined => {
  const meta = childrenNamedLocal(metadataEl, "meta").find(
    (m) => m.attr.property === property,
  )
  const raw = meta?.val
  if (raw === undefined || raw.trim().length === 0) return undefined
  return raw
}

const guideFromPackage = (doc: XmlElement): OpfGuideReference[] => {
  const guideEl = childNamedLocal(doc, "guide")
  if (guideEl === undefined) return []

  const refs: OpfGuideReference[] = []

  for (const ref of childrenNamedLocal(guideEl, "reference")) {
    const href = ref.attr.href?.trim()
    if (href === undefined || href.length === 0) continue
    refs.push({
      href,
      title: ref.attr.title?.trim() ?? ``,
      type: ref.attr.type?.trim() ?? ``,
    })
  }

  return refs
}

const manifestItemFromXmlElement = (
  item: XmlElement,
): OpfSpineManifestItem | undefined => {
  const id = item.attr.id
  const href = item.attr.href
  if (id === undefined || id.length === 0) return undefined
  if (href === undefined || href.length === 0) return undefined

  const mediaType = item.attr["media-type"]
  const properties = item.attr.properties?.trim()
  return {
    id,
    href,
    ...(mediaType !== undefined && mediaType.length > 0 ? { mediaType } : {}),
    ...(properties !== undefined && properties.length > 0
      ? { properties }
      : {}),
  }
}

const manifestItemsAndById = (
  manifestEl: XmlElement,
): {
  items: OpfSpineManifestItem[]
  byId: Map<string, OpfSpineManifestItem>
} => {
  const items: OpfSpineManifestItem[] = []
  const byId = new Map<string, OpfSpineManifestItem>()

  for (const el of childrenNamedLocal(manifestEl, "item")) {
    const parsed = manifestItemFromXmlElement(el)
    if (parsed === undefined) continue
    items.push(parsed)
    byId.set(parsed.id, parsed)
  }

  return { items, byId }
}

const spineRowsFromByIdAndSpine = (
  byId: Map<string, OpfSpineManifestItem>,
  spineEl: XmlElement,
): OpfSpineRow[] => {
  const rows: OpfSpineRow[] = []

  for (const itemref of childrenNamedLocal(spineEl, "itemref")) {
    const idref = itemref.attr.idref
    if (idref === undefined || idref.trim().length === 0) continue

    const manifestItem = byId.get(idref)
    if (manifestItem === undefined) continue

    const hints = layoutHintsFromItemrefProperties(itemref.attr.properties)

    rows.push({
      idref,
      id: manifestItem.id,
      href: manifestItem.href,
      ...(manifestItem.mediaType !== undefined
        ? { mediaType: manifestItem.mediaType }
        : {}),
      ...(manifestItem.properties !== undefined
        ? { properties: manifestItem.properties }
        : {}),
      ...(hints.renditionLayout !== undefined
        ? { renditionLayout: hints.renditionLayout }
        : {}),
      ...(hints.pageSpreadLeft !== undefined
        ? { pageSpreadLeft: hints.pageSpreadLeft }
        : {}),
      ...(hints.pageSpreadRight !== undefined
        ? { pageSpreadRight: hints.pageSpreadRight }
        : {}),
    })
  }

  return rows
}

export type OpfMetadata = {
  readonly kind: "opf"
  readonly manifestItems: ReadonlyArray<OpfSpineManifestItem>
  readonly spineRows: ReadonlyArray<OpfSpineRow>
  readonly spineTocIdref: string | undefined
  readonly identifiers: ReadonlyArray<OpfIdentifier>
  readonly title: string | undefined
  /** `dc:creator` values, in document order, trimmed; empty when none. */
  readonly creators: ReadonlyArray<string>
  /** First non-empty `dc:publisher`, trimmed. */
  readonly publisher: string | undefined
  /** First non-empty `dc:rights`, trimmed. */
  readonly rights: string | undefined
  /** `dc:language` values, in document order, trimmed; empty when none. */
  readonly languages: ReadonlyArray<string>
  /** `dc:subject` values, in document order, trimmed; empty when none. */
  readonly subjects: ReadonlyArray<string>
  /**
   * Raw `dc:date` value as authored. EPUB 3 requires W3CDTF (a profile
   * of ISO 8601), but real-world publishers also ship free text here,
   * so the value is exposed verbatim and consumers normalize as needed.
   */
  readonly date: string | undefined
  /**
   * Manifest-relative `href` of the cover image, when one can be
   * resolved from `cover-image` properties (EPUB 3), the EPUB 2
   * `<meta name="cover">` convention, or an `id` that contains
   * `cover` on an image manifest item. The href is returned exactly
   * as it appears in the manifest — callers own folder-prefix
   * resolution against the OPF's location in the archive.
   */
  readonly coverHref: string | undefined
  readonly renditionLayoutMeta: string | undefined
  readonly renditionFlowMeta: string | undefined
  readonly renditionSpreadMeta: string | undefined
  readonly pageProgressionDirection: string | undefined
  readonly guide: ReadonlyArray<OpfGuideReference>
}

/**
 * Parses an EPUB package document (OPF) into structured metadata.
 *
 * Direct children of `package` (`metadata`, `manifest`, `spine`, `guide`) and
 * their structural children (`item`, `itemref`, `reference`, `meta`) are
 * matched by **local name** (ASCII case-insensitive), so prefixed tags such as
 * `opf:manifest` are supported the same as unprefixed `manifest`.
 *
 * Attribute names on `spine` / `itemref` are still read as emitted by xmldoc
 * (no QName normalization).
 */
export const parseOpf = (opfXml: string): OpfMetadata => {
  const doc = new XmlDocument(opfXml)
  const manifestEl = childNamedLocal(doc, "manifest")
  const spineEl = childNamedLocal(doc, "spine")
  const metadataEl = childNamedLocal(doc, "metadata")

  let manifestItems: OpfSpineManifestItem[] = []
  let spineRows: OpfSpineRow[] = []

  if (manifestEl !== undefined) {
    const { items, byId } = manifestItemsAndById(manifestEl)
    manifestItems = items
    if (spineEl !== undefined) {
      spineRows = spineRowsFromByIdAndSpine(byId, spineEl)
    }
  }

  const pageProgressionDirectionRaw =
    spineEl?.attr["page-progression-direction"]
  const pageProgressionDirection =
    pageProgressionDirectionRaw !== undefined &&
    pageProgressionDirectionRaw.trim().length > 0
      ? pageProgressionDirectionRaw
      : undefined

  const spineTocRaw = spineEl?.attr.toc
  const spineTocIdref =
    spineTocRaw !== undefined && spineTocRaw.trim().length > 0
      ? spineTocRaw.trim()
      : undefined

  let title: string | undefined
  let publisher: string | undefined
  let rights: string | undefined
  let date: string | undefined
  let creators: string[] = []
  let languages: string[] = []
  let subjects: string[] = []
  let renditionLayoutMeta: string | undefined
  let renditionFlowMeta: string | undefined
  let renditionSpreadMeta: string | undefined
  const identifiers: OpfIdentifier[] = []

  if (metadataEl !== undefined) {
    title = firstTextByLocalName(metadataEl, "title")
    publisher = firstTextByLocalName(metadataEl, "publisher")
    rights = firstTextByLocalName(metadataEl, "rights")
    date = firstTextByLocalName(metadataEl, "date")
    creators = textsByLocalName(metadataEl, "creator")
    languages = textsByLocalName(metadataEl, "language")
    subjects = textsByLocalName(metadataEl, "subject")
    renditionLayoutMeta = metaValByProperty(metadataEl, "rendition:layout")
    renditionFlowMeta = metaValByProperty(metadataEl, "rendition:flow")
    renditionSpreadMeta = metaValByProperty(metadataEl, "rendition:spread")
    identifiers.push(...identifiersFromMetadata(metadataEl))
  }

  const coverHref = coverHrefFromManifestAndMetadata({
    manifestItems,
    metadataEl,
  })

  const guide = guideFromPackage(doc)

  return {
    kind: "opf",
    manifestItems,
    spineRows,
    spineTocIdref,
    identifiers,
    title,
    creators,
    publisher,
    rights,
    languages,
    subjects,
    date,
    coverHref,
    renditionLayoutMeta,
    renditionFlowMeta,
    renditionSpreadMeta,
    pageProgressionDirection,
    guide,
  }
}
