import { getUriBasePath, urlJoin } from "@prose-reader/shared"
import { XmlDocument, XmlElement, type XmlNodeBase } from "xmldoc"
import { readRecordAsText } from "../archives/readRecordAsText"
import type { Archive } from "../archives/types"
import type { OpfMetadata } from "../opf/parse"
import { getXmlElementInnerText } from "../utils/getXmlElementInnerText"
import { tokenizeXmlSpaceSeparatedList } from "../utils/tokenizeXmlSpaceSeparatedList"
import type { ArchiveTocItem } from "./types"

const manifestItemIsNavDocument = (item: {
  readonly properties?: string
}): boolean => tokenizeXmlSpaceSeparatedList(item.properties).includes(`nav`)

/**
 * @see https://www.w3.org/TR/epub-33/#sec-nav-def-model
 */
const extractNavChapter = (
  li: XmlElement,
  { basePath }: { basePath: string },
) => {
  const chp: ArchiveTocItem = {
    contents: [],
    path: ``,
    containerHref: ``,
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
    chp.containerHref = chp.path
  }
  const sublistNode = li.childNamed(`ol`)
  if (sublistNode) {
    const children = sublistNode.childrenNamed(`li`)
    if (children && children.length > 0) {
      chp.contents = children.map((child) =>
        extractNavChapter(child, { basePath }),
      )
    }
  }

  return chp
}

const buildTocFromNavDocument = (
  doc: XmlDocument,
  { basePath }: { basePath: string },
) => {
  const toc: ArchiveTocItem[] = []

  let navDataChildren: XmlNodeBase[] | undefined

  if (doc.descendantWithPath(`body.nav.ol`)) {
    navDataChildren = doc.descendantWithPath(`body.nav.ol`)?.children
  } else if (doc.descendantWithPath(`body.section.nav.ol`)) {
    navDataChildren = doc.descendantWithPath(`body.section.nav.ol`)?.children
  }

  if (navDataChildren && navDataChildren.length > 0) {
    navDataChildren
      .filter(
        (li): li is XmlElement => li instanceof XmlElement && li.name === `li`,
      )
      .forEach((li) => {
        toc.push(extractNavChapter(li, { basePath }))
      })
  }

  return toc
}

export const resolveTocFromNav = async (
  opf: OpfMetadata,
  archive: Archive,
): Promise<ArchiveTocItem[] | undefined> => {
  const navItem = opf.manifestItems.find(manifestItemIsNavDocument)

  if (navItem?.href) {
    const tocFile = archive.records.find((item) =>
      item.uri.endsWith(navItem.href),
    )

    if (tocFile && !tocFile.dir) {
      const doc = new XmlDocument(await readRecordAsText(tocFile))

      const tocFileBasePath = getUriBasePath(tocFile.uri)

      /**
       * links inside toc.xhtml are relative to the toc.xhtml file,
       * not the opf file anymore
       */
      return buildTocFromNavDocument(doc, { basePath: tocFileBasePath })
    }
  }

  return undefined
}
