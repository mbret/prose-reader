import type { XmlElement, XmlNodeBase } from "xmldoc"
import { XmlDocument } from "xmldoc"
import { tokenizeXmlSpaceSeparatedList } from "../../utils/tokenizeXmlSpaceSeparatedList.ts"
import { opfIdentifierSchemeAttribute } from "./identifierScheme.ts"
import {
  opfNamespacedAttribute,
  opfNamespacePrefixes,
  type XmlNamespaceScope,
  xmlNamespaceScope,
} from "./opfNamespace.ts"
import { layoutHintsFromItemrefProperties } from "./spineItemrefProperties.ts"

export type OpfSpineManifestItem = {
  readonly id: string
  readonly href: string
  readonly mediaType?: string
  readonly properties?: string
}

export type OpfIdentifier = {
  readonly value: string
  readonly scheme?: string
  /** Element `id`, which can be targeted by `package@unique-identifier`. */
  readonly id?: string
  /** Present when `package@unique-identifier` targets this identifier. */
  readonly unique?: true
}

export type OpfTitle = {
  readonly value: string
  /** Element `id`, which `meta refines` entries target. */
  readonly id?: string
}

export type OpfSpineRow = {
  readonly idref: string
  readonly id: string
  readonly href: string
  readonly mediaType?: string
  readonly properties?: string
  readonly renditionLayout?: `reflowable` | `pre-paginated`
  readonly renditionFlow?:
    | `scrolled-continuous`
    | `scrolled-doc`
    | `paginated`
    | `auto`
  readonly pageSpreadLeft?: true
  readonly pageSpreadRight?: true
}

export type OpfGuideReference = {
  readonly href: string
  readonly title: string
  readonly type: string
}

/**
 * One `<meta>` child of `metadata`, captured verbatim whatever its shape:
 * the EPUB 3 `property`/`refines` form, the EPUB 2 `name`/`content` pair
 * form (including vendor vocabularies such as `calibre:series`), or any
 * mix. Attributes and text are trimmed; blank ones are omitted. This is the
 * open-world channel — OPF `meta` is an open vocabulary, so everything is
 * kept rather than a hand-picked subset.
 */
export type OpfMetaEntry = {
  /** EPUB 3 `property` attribute (e.g. `dcterms:modified`, `belongs-to-collection`). */
  readonly property?: string
  /** EPUB 3 `refines` attribute, verbatim (usually `#some-id`). */
  readonly refines?: string
  readonly scheme?: string
  readonly id?: string
  /** EPUB 2 `name` attribute (name/content pair form). */
  readonly name?: string
  /** EPUB 2 `content` attribute. */
  readonly content?: string
  /** Trimmed element text (EPUB 3 form), when non-empty. */
  readonly value?: string
}

export type OpfContributor = {
  /** Trimmed element text. */
  readonly name: string
  /** Which element the entry was authored as. */
  readonly source: "creator" | "contributor"
  /** Element `id`, the anchor for EPUB 3 `refines` metadata. */
  readonly id?: string
  /**
   * Role tokens (MARC relator codes in well-formed books, e.g. `aut`,
   * `ill`): the EPUB 2 `opf:role` attribute first, then every EPUB 3
   * `meta refines property="role"` value in document order. Verbatim,
   * not validated against the MARC list.
   */
  readonly roles: ReadonlyArray<string>
  /** EPUB 2 `opf:file-as` attribute, or the `file-as` refines when absent. */
  readonly fileAs?: string
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

const identifiersFromMetadata = (
  metadataEl: XmlElement,
  uniqueIdentifierId: string | undefined,
  metadataScope: XmlNamespaceScope,
): OpfIdentifier[] => {
  const identifiers: OpfIdentifier[] = []

  metadataEl.eachChild((child) => {
    if (elementLocalName(child.name).toLowerCase() !== "identifier") return

    const value = child.val.trim()
    if (value.length === 0) return

    const scheme = opfIdentifierSchemeAttribute(
      child.attr,
      opfNamespacePrefixes(xmlNamespaceScope(child.attr, metadataScope)),
    )
    const schemeTrimmed = scheme?.trim()
    const idTrimmed = child.attr.id?.trim()
    const id =
      idTrimmed !== undefined && idTrimmed.length > 0 ? idTrimmed : undefined

    identifiers.push({
      value,
      ...(schemeTrimmed !== undefined && schemeTrimmed.length > 0
        ? { scheme: schemeTrimmed }
        : {}),
      ...(id !== undefined ? { id } : {}),
      ...(id !== undefined && id === uniqueIdentifierId
        ? { unique: true }
        : {}),
    })
  })

  return identifiers
}

const titlesFromMetadata = (metadataEl: XmlElement): OpfTitle[] => {
  const titles: OpfTitle[] = []

  metadataEl.eachChild((child) => {
    if (elementLocalName(child.name).toLowerCase() !== "title") return

    const value = child.val.trim()
    if (value.length === 0) return

    const id = child.attr.id?.trim()

    titles.push({
      value,
      ...(id !== undefined && id.length > 0 ? { id } : {}),
    })
  })

  return titles
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

const trimmedAttr = (el: XmlElement, name: string): string | undefined => {
  const trimmed = el.attr[name]?.trim()
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

/** {@link trimmedAttr} for an attribute in the OPF namespace. */
const trimmedOpfAttr = (
  el: XmlElement,
  opfPrefixes: ReadonlyArray<string>,
  localName: string,
): string | undefined => {
  const trimmed = opfNamespacedAttribute(el.attr, opfPrefixes, [
    localName,
  ])?.trim()

  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined
}

const metasFromMetadata = (metadataEl: XmlElement): OpfMetaEntry[] => {
  const metas: OpfMetaEntry[] = []

  metadataEl.eachChild((child) => {
    if (elementLocalName(child.name).toLowerCase() !== "meta") return

    const property = trimmedAttr(child, "property")
    const refines = trimmedAttr(child, "refines")
    const scheme = trimmedAttr(child, "scheme")
    const id = trimmedAttr(child, "id")
    const name = trimmedAttr(child, "name")
    const content = trimmedAttr(child, "content")
    const valueTrimmed = child.val.trim()
    const value = valueTrimmed.length > 0 ? valueTrimmed : undefined

    const entry: OpfMetaEntry = {
      ...(property !== undefined ? { property } : {}),
      ...(refines !== undefined ? { refines } : {}),
      ...(scheme !== undefined ? { scheme } : {}),
      ...(id !== undefined ? { id } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(value !== undefined ? { value } : {}),
    }

    if (Object.keys(entry).length === 0) return

    metas.push(entry)
  })

  return metas
}

/** `refines` is a relative IRI, in practice `#id`; a missing `#` is tolerated. */
const refinesTargetsId = (refines: string, id: string): boolean =>
  refines.replace(/^#/, "") === id

const contributorsFromMetadata = (
  metadataEl: XmlElement,
  metas: ReadonlyArray<OpfMetaEntry>,
  metadataScope: XmlNamespaceScope,
): OpfContributor[] => {
  const contributors: OpfContributor[] = []

  metadataEl.eachChild((child) => {
    const local = elementLocalName(child.name).toLowerCase()
    if (local !== "creator" && local !== "contributor") return

    const name = child.val.trim()
    if (name.length === 0) return

    const id = trimmedAttr(child, "id")
    const refinesFor = (property: string): string[] =>
      id === undefined
        ? []
        : metas.flatMap((meta) =>
            meta.refines !== undefined &&
            refinesTargetsId(meta.refines, id) &&
            meta.property === property &&
            meta.value !== undefined
              ? [meta.value]
              : [],
          )

    const opfPrefixes = opfNamespacePrefixes(
      xmlNamespaceScope(child.attr, metadataScope),
    )
    const attributeRole = trimmedOpfAttr(child, opfPrefixes, "role")
    const roles = [
      ...(attributeRole !== undefined ? [attributeRole] : []),
      ...refinesFor("role"),
    ]

    const fileAs =
      trimmedOpfAttr(child, opfPrefixes, "file-as") ?? refinesFor("file-as")[0]

    contributors.push({
      name,
      source: local,
      ...(id !== undefined ? { id } : {}),
      roles,
      ...(fileAs !== undefined ? { fileAs } : {}),
    })
  })

  return contributors
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
      ...(hints.renditionFlow !== undefined
        ? { renditionFlow: hints.renditionFlow }
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
  /**
   * Every non-empty `dc:title`, in document order — the first is the main
   * title per EPUB 3. Ids are retained so `meta refines` entries
   * (`title-type`, `display-seq`, `file-as`) can be attached to their title.
   */
  readonly titles: ReadonlyArray<OpfTitle>
  /** `dc:creator` values, in document order, trimmed; empty when none. */
  readonly creators: ReadonlyArray<string>
  /**
   * Every `dc:creator` and `dc:contributor`, in document order, with role
   * attribution from both conventions (EPUB 2 `opf:role` attribute, EPUB 3
   * `meta refines property="role"`). `creators` stays the plain-text view
   * of the `dc:creator` subset.
   */
  readonly contributors: ReadonlyArray<OpfContributor>
  /** First non-empty `dc:publisher`, trimmed. */
  readonly publisher: string | undefined
  /** First non-empty `dc:description`, trimmed. */
  readonly description: string | undefined
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
  /**
   * Every `<meta>` element of `metadata`, captured verbatim (see
   * {@link OpfMetaEntry}). Known properties (`rendition:*`, roles…) are
   * also exposed as dedicated fields; this list is the lossless record.
   */
  readonly metas: ReadonlyArray<OpfMetaEntry>
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
  const packageScope = xmlNamespaceScope(doc.attr)
  const uniqueIdentifierIdRaw = doc.attr["unique-identifier"]?.trim()
  const uniqueIdentifierId =
    uniqueIdentifierIdRaw !== undefined && uniqueIdentifierIdRaw.length > 0
      ? uniqueIdentifierIdRaw
      : undefined

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

  let titles: OpfTitle[] = []
  let publisher: string | undefined
  let description: string | undefined
  let rights: string | undefined
  let date: string | undefined
  let creators: string[] = []
  let contributors: OpfContributor[] = []
  let languages: string[] = []
  let subjects: string[] = []
  let renditionLayoutMeta: string | undefined
  let renditionFlowMeta: string | undefined
  let renditionSpreadMeta: string | undefined
  let metas: OpfMetaEntry[] = []
  const identifiers: OpfIdentifier[] = []

  if (metadataEl !== undefined) {
    const metadataScope = xmlNamespaceScope(metadataEl.attr, packageScope)

    titles = titlesFromMetadata(metadataEl)
    publisher = firstTextByLocalName(metadataEl, "publisher")
    description = firstTextByLocalName(metadataEl, "description")
    rights = firstTextByLocalName(metadataEl, "rights")
    date = firstTextByLocalName(metadataEl, "date")
    creators = textsByLocalName(metadataEl, "creator")
    languages = textsByLocalName(metadataEl, "language")
    subjects = textsByLocalName(metadataEl, "subject")
    renditionLayoutMeta = metaValByProperty(metadataEl, "rendition:layout")
    renditionFlowMeta = metaValByProperty(metadataEl, "rendition:flow")
    renditionSpreadMeta = metaValByProperty(metadataEl, "rendition:spread")
    metas = metasFromMetadata(metadataEl)
    contributors = contributorsFromMetadata(metadataEl, metas, metadataScope)
    identifiers.push(
      ...identifiersFromMetadata(metadataEl, uniqueIdentifierId, metadataScope),
    )
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
    titles,
    creators,
    contributors,
    publisher,
    description,
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
    metas,
  }
}
