import { getUriBasePath } from "@prose-reader/shared"
import { XmlDocument, type XmlElement } from "xmldoc"
import { readRecordAsText } from "../archives/readRecordAsText.ts"
import { type Archive, getArchiveFileRecordByUri } from "../archives/types.ts"
import type { OpfMetadata } from "../metadata/opf/parse.ts"
import { toContainerHref, toContainerUri } from "../utils/toContainerUri.ts"
import type { ArchiveTocItem } from "./types.ts"

const mapNcxChapter = (
  point: XmlElement,
  { basePath, prefix }: { basePath: string; prefix: string },
) => {
  const src = point?.childNamed(`${prefix}content`)?.attr.src || ``
  const path = src ? toContainerHref(src, basePath) : ``

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
      const ncxRecord = getArchiveFileRecordByUri(
        archive,
        toContainerUri(ncxItem.href, opfBasePath),
      )

      if (ncxRecord) {
        const ncxData = new XmlDocument(await readRecordAsText(ncxRecord))

        /**
         * content src inside the ncx are relative to the ncx file,
         * not the opf file
         */
        return buildTocFromNcxDocument(ncxData, {
          basePath: getUriBasePath(ncxRecord.uri),
        })
      }
    }
  }

  return undefined
}
