import type { Manifest } from "@prose-reader/shared"
import { urlJoin } from "@prose-reader/shared"
import { XmlDocument, type XmlElement, type XmlNodeBase } from "xmldoc"
import { type Archive, getArchiveOpfInfo } from ".."
import { getUriBasePath } from "../utils/uri"
import { getXmlElementInnerText } from "./xml"

type Toc = NonNullable<Manifest[`nav`]>[`toc`]
type TocItem = NonNullable<Manifest[`nav`]>[`toc`][number]

/**
 * @see https://www.w3.org/TR/epub-33/#sec-nav-def-model
 */
const extractNavChapter = (
  li: XmlElement,
  { basePath, baseUrl }: { basePath: string; baseUrl: string },
) => {
  const chp: TocItem = {
    contents: [],
    path: ``,
    href: ``,
    title: ``,
  }

  let contentNode = li.childNamed(`span`) || li.childNamed(`a`)

  chp.title =
    (contentNode?.attr.title ||
      contentNode?.val.trim() ||
      getXmlElementInnerText(contentNode)) ??
    ``

  let node = contentNode?.name

  if (node !== `a`) {
    contentNode = li.descendantWithPath(`${node}.a`)
    if (contentNode) {
      node = contentNode.name.toLowerCase()
    }
  }

  if (node === `a` && contentNode?.attr.href) {
    chp.path = urlJoin(basePath, contentNode.attr.href)
    chp.href = urlJoin(baseUrl, basePath, contentNode.attr.href)
  }
  const sublistNode = li.childNamed(`ol`)
  if (sublistNode) {
    const children = sublistNode.childrenNamed(`li`)
    if (children && children.length > 0) {
      chp.contents = children.map((child) =>
        extractNavChapter(child, { basePath, baseUrl }),
      )
    }
  }

  return chp
}

const buildTOCFromNav = (
  doc: XmlDocument,
  { basePath, baseUrl }: { basePath: string; baseUrl: string },
) => {
  const toc: Toc = []

  let navDataChildren: XmlNodeBase[] | undefined

  if (doc.descendantWithPath(`body.nav.ol`)) {
    navDataChildren = doc.descendantWithPath(`body.nav.ol`)?.children
  } else if (doc.descendantWithPath(`body.section.nav.ol`)) {
    navDataChildren = doc.descendantWithPath(`body.section.nav.ol`)?.children
  }

  if (navDataChildren && navDataChildren.length > 0) {
    navDataChildren
      .filter((li) => (li as XmlElement).name === `li`)
      .forEach((li) =>
        toc.push(extractNavChapter(li as XmlElement, { basePath, baseUrl })),
      )
  }

  return toc
}

const parseTocFromNavPath = async (
  opfXmlDoc: XmlDocument,
  archive: Archive,
  { baseUrl }: { opfBasePath: string; baseUrl: string },
) => {
  // Try to detect if there is a nav item
  const navItem = opfXmlDoc
    .childNamed(`manifest`)
    ?.childrenNamed(`item`)
    .find((child) => child.attr.properties === `nav`)

  if (navItem) {
    const tocFile = Object.values(archive.files).find((item) =>
      item.uri.endsWith(navItem.attr.href || ``),
    )

    if (tocFile) {
      const doc = new XmlDocument(await tocFile.string())

      const tocFileBasePath = getUriBasePath(tocFile.uri)

      /**
       * links inside toc.xhtml are relative to the toc.xhtml file,
       * not the opf file anymore
       */
      return buildTOCFromNav(doc, { basePath: tocFileBasePath, baseUrl })
    }
  }
}

const mapNcxChapter = (
  point: XmlElement,
  {
    opfBasePath,
    baseUrl,
    prefix,
  }: { opfBasePath: string; baseUrl: string; prefix: string },
) => {
  const src = point?.childNamed(`${prefix}content`)?.attr.src || ``

  const out: TocItem = {
    title:
      point?.descendantWithPath(`${prefix}navLabel.${prefix}text`)?.val || ``,
    path: urlJoin(opfBasePath, src),
    href: urlJoin(baseUrl, opfBasePath, src),
    contents: [],
  }
  const children = point.childrenNamed(`${prefix}navPoint`)
  if (children && children.length > 0) {
    out.contents = children.map((pt) =>
      mapNcxChapter(pt, { opfBasePath, baseUrl, prefix }),
    )
  }

  return out
}

const buildTOCFromNCX = (
  ncxData: XmlDocument,
  { opfBasePath, baseUrl }: { opfBasePath: string; baseUrl: string },
) => {
  const toc: NonNullable<Manifest[`nav`]>[`toc`] = []

  const rootTagName = ncxData.name
  let prefix = ``
  if (rootTagName.indexOf(`:`) !== -1) {
    prefix = `${rootTagName.split(`:`)[0]}:`
  }

  ncxData
    .childNamed(`${prefix}navMap`)
    ?.childrenNamed(`${prefix}navPoint`)
    .forEach((point) =>
      toc.push(mapNcxChapter(point, { opfBasePath, baseUrl, prefix })),
    )

  return toc
}

const parseTocFromNcx = async ({
  opfData,
  opfBasePath,
  baseUrl,
  archive,
}: {
  opfData: XmlDocument
  opfBasePath: string
  archive: Archive
  baseUrl: string
}) => {
  const spine = opfData.childNamed(`spine`)
  const ncxId = spine?.attr.toc

  if (ncxId) {
    const ncxItem = opfData
      .childNamed(`manifest`)
      ?.childrenNamed(`item`)
      .find((item) => item.attr.id === ncxId)

    if (ncxItem) {
      const ncxPath = `${opfBasePath}${opfBasePath === `` ? `` : `/`}${ncxItem.attr.href}`

      const file = Object.values(archive.files).find((item) =>
        item.uri.endsWith(ncxPath),
      )

      if (file) {
        const ncxData = new XmlDocument(await file.string())

        return buildTOCFromNCX(ncxData, { opfBasePath, baseUrl })
      }
    }
  }
}

export const parseToc = async (
  opfXmlDoc: XmlDocument,
  archive: Archive,
  { baseUrl }: { baseUrl: string },
) => {
  const { basePath: opfBasePath } = getArchiveOpfInfo(archive) || {}

  const tocFromNcx = await parseTocFromNcx({
    opfData: opfXmlDoc,
    opfBasePath,
    archive,
    baseUrl,
  })

  if (tocFromNcx) {
    return tocFromNcx
  }

  return await parseTocFromNavPath(opfXmlDoc, archive, {
    opfBasePath,
    baseUrl,
  })
}
