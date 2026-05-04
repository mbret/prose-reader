import type { XmlElement } from "xmldoc"
import { XmlDocument } from "xmldoc"
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

const childNamedLocal = (
  parent: XmlElement,
  localName: string,
): XmlElement | undefined => {
  for (const node of parent.children) {
    if (node.type !== "element") continue
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
    if (node.type !== "element") continue
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

const titleFromMetadata = (metadataEl: XmlElement): string | undefined => {
  let found: string | undefined
  metadataEl.eachChild((child) => {
    if (found !== undefined) return
    if (elementLocalName(child.name).toLowerCase() !== "title") return
    const t = child.val.trim()
    if (t.length > 0) found = t
  })
  return found
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

const manifestItemsFromElement = (
  manifestEl: XmlElement,
): OpfSpineManifestItem[] => {
  const items: OpfSpineManifestItem[] = []

  for (const item of childrenNamedLocal(manifestEl, "item")) {
    const id = item.attr.id
    const href = item.attr.href
    if (id === undefined || id.length === 0) continue
    if (href === undefined || href.length === 0) continue

    const mediaType = item.attr["media-type"]
    const properties = item.attr.properties?.trim()
    items.push({
      id,
      href,
      ...(mediaType !== undefined && mediaType.length > 0 ? { mediaType } : {}),
      ...(properties !== undefined && properties.length > 0
        ? { properties }
        : {}),
    })
  }

  return items
}

const spineRowsFromRoots = (
  manifestEl: XmlElement,
  spineEl: XmlElement,
): OpfSpineRow[] => {
  const byId = new Map<string, OpfSpineManifestItem>()

  for (const item of childrenNamedLocal(manifestEl, "item")) {
    const id = item.attr.id
    const href = item.attr.href
    if (id === undefined || id.length === 0) continue
    if (href === undefined || href.length === 0) continue

    const mediaType = item.attr["media-type"]
    const properties = item.attr.properties?.trim()
    byId.set(id, {
      id,
      href,
      ...(mediaType !== undefined && mediaType.length > 0 ? { mediaType } : {}),
      ...(properties !== undefined && properties.length > 0
        ? { properties }
        : {}),
    })
  }

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
  readonly renditionLayoutMeta: string | undefined
  readonly renditionFlowMeta: string | undefined
  readonly renditionSpreadMeta: string | undefined
  readonly pageProgressionDirection: string | undefined
  readonly guide: ReadonlyArray<OpfGuideReference>
}

export const parseOpf = (opfXml: string): OpfMetadata => {
  const doc = new XmlDocument(opfXml)
  const manifestEl = childNamedLocal(doc, "manifest")
  const spineEl = childNamedLocal(doc, "spine")
  const metadataEl = childNamedLocal(doc, "metadata")

  const manifestItems =
    manifestEl !== undefined ? manifestItemsFromElement(manifestEl) : []
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

  const spineRows =
    manifestEl !== undefined && spineEl !== undefined
      ? spineRowsFromRoots(manifestEl, spineEl)
      : []

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
  let renditionLayoutMeta: string | undefined
  let renditionFlowMeta: string | undefined
  let renditionSpreadMeta: string | undefined
  const identifiers: OpfIdentifier[] = []

  if (metadataEl !== undefined) {
    title = titleFromMetadata(metadataEl)
    renditionLayoutMeta = metaValByProperty(metadataEl, "rendition:layout")
    renditionFlowMeta = metaValByProperty(metadataEl, "rendition:flow")
    renditionSpreadMeta = metaValByProperty(metadataEl, "rendition:spread")
    identifiers.push(...identifiersFromMetadata(metadataEl))
  }

  const guide = guideFromPackage(doc)

  return {
    kind: "opf",
    manifestItems,
    spineRows,
    spineTocIdref,
    identifiers,
    title,
    renditionLayoutMeta,
    renditionFlowMeta,
    renditionSpreadMeta,
    pageProgressionDirection,
    guide,
  }
}
