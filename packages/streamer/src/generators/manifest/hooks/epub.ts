import xmldoc from "xmldoc"
import { parseToc } from "../../../parsers/nav"
import type { Manifest } from "@prose-reader/shared"
import { extractKoboInformationFromArchive } from "../../../parsers/kobo"
import { Report } from "../../../report"
import { Archive } from "../../../archives/types"
import { getArchiveOpfInfo } from "../../../archives/getArchiveOpfInfo"
import { getSpineItemFilesFromArchive } from "../../../epub/getSpineItemFilesFromArchive"

type SpineItemProperties = `rendition:layout-reflowable` | `page-spread-left` | `page-spread-right`

export const getItemsFromDoc = (doc: xmldoc.XmlDocument) => {
  const manifestElm = doc.childNamed(`manifest`)

  return (
    manifestElm?.childrenNamed(`item`)?.map((el) => ({
      href: el.attr.href || ``,
      id: el.attr.id || ``,
      mediaType: el.attr[`media-type`],
    })) || []
  )
}

export const epubHook =
  ({ archive, baseUrl }: { archive: Archive; baseUrl: string }) =>
  async (manifest: Manifest): Promise<Manifest> => {
    const { data: opsFile, basePath: opfBasePath } = getArchiveOpfInfo(archive) || {}
    const koboInformation = await extractKoboInformationFromArchive(archive)

    if (!opsFile) {
      return manifest
    }

    const data = await opsFile.string()

    Report.log(data, koboInformation)

    const opfXmlDoc = new xmldoc.XmlDocument(data)

    const toc = (await parseToc(opfXmlDoc, archive, { baseUrl })) || []

    const metadataElm = opfXmlDoc.childNamed(`metadata`)
    const manifestElm = opfXmlDoc.childNamed(`manifest`)
    const spineElm = opfXmlDoc.childNamed(`spine`)
    const guideElm = opfXmlDoc.childNamed(`guide`)
    const titleElm = metadataElm?.childNamed(`dc:title`)
    const metaElmChildren = metadataElm?.childrenNamed(`meta`) || []
    const metaElmWithRendition = metaElmChildren.find((meta) => meta.attr.property === `rendition:layout`)
    const metaElmWithRenditionFlow = metaElmChildren.find((meta) => meta.attr.property === `rendition:flow`)
    const metaElmWithRenditionSpread = metaElmChildren.find((meta) => meta.attr.property === `rendition:spread`)

    const publisherRenditionLayout = metaElmWithRendition?.val as `reflowable` | `pre-paginated` | undefined
    const publisherRenditionFlow = metaElmWithRenditionFlow?.val as
      | `scrolled-continuous`
      | `scrolled-doc`
      | `paginated`
      | `auto`
      | undefined
    const renditionSpread = metaElmWithRenditionSpread?.val as `auto` | undefined

    const title = titleElm?.val || archive.files.find(({ dir }) => dir)?.basename || ``
    const pageProgressionDirection = spineElm?.attr[`page-progression-direction`] as `ltr` | `rtl` | undefined

    const archiveSpineItems = await getSpineItemFilesFromArchive({ archive })

    const totalSize = archiveSpineItems.reduce((size, file) => file.size + size, 0)

    return {
      filename: archive.filename,
      nav: {
        toc,
      },
      renditionLayout: publisherRenditionLayout || koboInformation.renditionLayout || `reflowable`,
      renditionFlow: publisherRenditionFlow || `auto`,
      renditionSpread,
      title,
      readingDirection: pageProgressionDirection || `ltr`,
      spineItems:
        spineElm?.childrenNamed(`itemref`).map((itemrefElm) => {
          const manifestItem = manifestElm?.childrenNamed(`item`).find((item) => item.attr.id === itemrefElm?.attr.idref)
          const href = manifestItem?.attr.href || ``
          const properties = (itemrefElm?.attr.properties?.split(` `) || []) as SpineItemProperties[]
          const itemSize = archive.files.find((file) => file.uri.endsWith(href))?.size || 0

          // we use base url or nothing (and stay relative)
          const hrefBaseUri = baseUrl ?? ""

          return {
            id: manifestItem?.attr.id || ``,
            href: manifestItem?.attr.href?.startsWith(`https://`)
              ? manifestItem?.attr.href
              : opfBasePath
                ? `${hrefBaseUri}${opfBasePath}/${manifestItem?.attr.href}`
                : `${hrefBaseUri}${manifestItem?.attr.href}`,
            renditionLayout: publisherRenditionLayout || `reflowable`,
            ...(properties.find((property) => property === `rendition:layout-reflowable`) && {
              renditionLayout: `reflowable`,
            }),
            progressionWeight: itemSize / totalSize,
            pageSpreadLeft: properties.some((property) => property === `page-spread-left`) || undefined,
            pageSpreadRight: properties.some((property) => property === `page-spread-right`) || undefined,
            // size: itemSize
            mediaType: manifestItem?.attr[`media-type`],
          }
        }) || [],
      items: getItemsFromDoc(opfXmlDoc),
      guide: guideElm?.childrenNamed(`reference`).map((elm) => {
        return {
          href: elm.attr.href || ``,
          title: elm.attr.title || ``,
          type: elm.attr.type as NonNullable<Manifest[`guide`]>[number][`type`],
        }
      }),
    }
  }
