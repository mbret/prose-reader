import {
  type OpfMetadata,
  tokenizeXmlSpaceSeparatedList,
} from "@prose-reader/archive-parser"
import type { Manifest } from "@prose-reader/shared"
import { urlJoin } from "@prose-reader/shared"
import { XmlDocument, type XmlElement, type XmlNodeBase } from "xmldoc"
import { type Archive, getArchiveOpfInfo } from ".."
import { getUriBasePath } from "../utils/uri"
import { getXmlElementInnerText } from "./xml"

type Toc = NonNullable<Manifest[`nav`]>[`toc`]
type TocItem = NonNullable<Manifest[`nav`]>[`toc`][number]

const manifestItemIsNavDocument = (item: {
  readonly properties?: string
}): boolean => tokenizeXmlSpaceSeparatedList(item.properties).includes(`nav`)

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
      .forEach((li) => {
        toc.push(extractNavChapter(li as XmlElement, { basePath, baseUrl }))
      })
  }

  return toc
}

const parseTocFromNavPath = async (
  opf: OpfMetadata,
  archive: Archive,
  { baseUrl }: { baseUrl: string },
) => {
  const navItem = opf.manifestItems.find(manifestItemIsNavDocument)

  if (navItem?.href) {
    const tocFile = archive.records.find((item) =>
      item.uri.endsWith(navItem.href),
    )

    if (tocFile && !tocFile.dir) {
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
    .forEach((point) => {
      toc.push(mapNcxChapter(point, { opfBasePath, baseUrl, prefix }))
    })

  return toc
}

const parseTocFromNcx = async ({
  opf,
  opfBasePath,
  baseUrl,
  archive,
}: {
  opf: OpfMetadata
  opfBasePath: string
  archive: Archive
  baseUrl: string
}) => {
  const ncxId = opf.spineTocIdref

  if (ncxId) {
    const ncxItem = opf.manifestItems.find((item) => item.id === ncxId)

    if (ncxItem) {
      const ncxPath = `${opfBasePath}${opfBasePath === `` ? `` : `/`}${ncxItem.href}`

      const file = archive.records.find((item) => item.uri.endsWith(ncxPath))

      if (file && !file.dir) {
        const ncxData = new XmlDocument(await file.string())

        return buildTOCFromNCX(ncxData, { opfBasePath, baseUrl })
      }
    }
  }
}

export const parseToc = async (
  opf: OpfMetadata,
  archive: Archive,
  { baseUrl }: { baseUrl: string },
) => {
  const { basePath: opfBasePath } = getArchiveOpfInfo(archive) || {}

  const tocFromNav = await parseTocFromNavPath(opf, archive, {
    baseUrl,
  })

  if (tocFromNav) {
    return tocFromNav
  }

  const tocFromNcx = await parseTocFromNcx({
    opf,
    opfBasePath: opfBasePath ?? ``,
    archive,
    baseUrl,
  })

  if (tocFromNcx) {
    return tocFromNcx
  }
}
