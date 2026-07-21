import { getUriBasePath, urlJoin } from "@prose-reader/shared"
import { XmlDocument, type XmlElement } from "xmldoc"
import { readRecordAsText } from "../archives/readRecordAsText"
import type { Archive } from "../archives/types"
import type { OpfMetadata } from "../opf/parse"
import type { ArchiveTocItem } from "./types"

const mapNcxChapter = (
  point: XmlElement,
  { basePath, prefix }: { basePath: string; prefix: string },
) => {
  const src = point?.childNamed(`${prefix}content`)?.attr.src || ``
  const path = urlJoin(basePath, src)

  const out: ArchiveTocItem = {
    title:
      point?.descendantWithPath(`${prefix}navLabel.${prefix}text`)?.val || ``,
    path,
    containerHref: path,
    contents: [],
  }
  const children = point.childrenNamed(`${prefix}navPoint`)
  if (children && children.length > 0) {
    out.contents = children.map((pt) => mapNcxChapter(pt, { basePath, prefix }))
  }

  return out
}

const buildTocFromNcxDocument = (
  ncxData: XmlDocument,
  { basePath }: { basePath: string },
) => {
  const toc: ArchiveTocItem[] = []

  const rootTagName = ncxData.name
  let prefix = ``
  if (rootTagName.indexOf(`:`) !== -1) {
    prefix = `${rootTagName.split(`:`)[0]}:`
  }

  ncxData
    .childNamed(`${prefix}navMap`)
    ?.childrenNamed(`${prefix}navPoint`)
    .forEach((point) => {
      toc.push(mapNcxChapter(point, { basePath, prefix }))
    })

  return toc
}

export const resolveTocFromNcx = async ({
  opf,
  opfBasePath,
  archive,
}: {
  opf: OpfMetadata
  opfBasePath: string
  archive: Archive
}): Promise<ArchiveTocItem[] | undefined> => {
  const ncxId = opf.spineTocIdref

  if (ncxId) {
    const ncxItem = opf.manifestItems.find((item) => item.id === ncxId)

    if (ncxItem) {
      const ncxPath = `${opfBasePath}${opfBasePath === `` ? `` : `/`}${ncxItem.href}`

      const file = archive.records.find((item) => item.uri.endsWith(ncxPath))

      if (file && !file.dir) {
        const ncxData = new XmlDocument(await readRecordAsText(file))

        /**
         * content src inside the ncx are relative to the ncx file,
         * not the opf file
         */
        return buildTocFromNcxDocument(ncxData, {
          basePath: getUriBasePath(file.uri),
        })
      }
    }
  }

  return undefined
}
